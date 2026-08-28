import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { protectedStandardRoutine } from './domain/routines/protectedRoutine'
import type { Routine } from './domain/routines/types'
import { buildWorkoutSequence } from './domain/timer/sequence'
import type { WorkoutState } from './domain/timer/types'
import {
  clearWorkoutCheckpoint,
  readWorkoutCheckpointRoutineId,
  restoreWorkoutCheckpoint,
  saveWorkoutCheckpoint,
} from './domain/timer/workoutPersistence'
import { PreWorkoutReview } from './presentation/PreWorkoutReview'
import { PwaUpdatePrompt } from './presentation/PwaUpdatePrompt'
import { RoutineLibrary } from './presentation/RoutineLibrary'
import { WorkoutRunner } from './presentation/WorkoutRunner'
import { formatClock } from './presentation/timerPresentation'
import { primeTimerAudio } from './presentation/timerAudio'
import { useScreenWakeLock, wakeLockNotice } from './presentation/useScreenWakeLock'

type Screen = 'loading' | 'home' | 'preworkout' | 'active' | 'complete'
const LEGACY_STANDARD_ROUTINE_ID = 'protected-standard'

interface AppProps {
  timerSoundsEnabled?: boolean
  loadRoutines?: () => Promise<readonly Routine[]>
}

const loadStoredRoutines = async () => {
  const { routineRepository } = await import('./data/routineRepository')
  return routineRepository.list()
}

export function App({
  timerSoundsEnabled = true,
  loadRoutines = loadStoredRoutines,
}: AppProps) {
  const [screen, setScreen] = useState<Screen>('loading')
  const [routines, setRoutines] = useState<readonly Routine[]>([])
  const [selectedRoutine, setSelectedRoutine] = useState<Routine>()
  const [storageNotice, setStorageNotice] = useState<string>()
  const [initialWorkout, setInitialWorkout] = useState<WorkoutState>()
  const [initialActiveElapsedMs, setInitialActiveElapsedMs] = useState(0)
  const [completedWorkoutMs, setCompletedWorkoutMs] = useState(0)
  const [recoveryMessage, setRecoveryMessage] = useState<string>()
  const [recoveryWarning, setRecoveryWarning] = useState(false)

  const sequence = useMemo(
    () =>
      selectedRoutine === undefined
        ? []
        : buildWorkoutSequence(selectedRoutine.timing),
    [selectedRoutine],
  )
  const wakeLockStatus = useScreenWakeLock(
    screen === 'active' || screen === 'complete',
  )
  const wakeLockMessage = wakeLockNotice(wakeLockStatus)

  useEffect(() => {
    let active = true
    const showLoadedRoutines = (loadedRoutines: readonly Routine[]) => {
      if (!active) return
      setRoutines(loadedRoutines)

      const checkpointRoutineId = readWorkoutCheckpointRoutineId()
      if (checkpointRoutineId === undefined) {
        setScreen('home')
        return
      }

      const recoveryRoutine =
        checkpointRoutineId === LEGACY_STANDARD_ROUTINE_ID
          ? loadedRoutines.find(({ ownership }) => ownership === 'protected')
          : loadedRoutines.find(({ id }) => id === checkpointRoutineId)
      if (recoveryRoutine === undefined) {
        clearWorkoutCheckpoint()
        setStorageNotice(
          'An interrupted workout could not be restored because its routine is unavailable.',
        )
        setScreen('home')
        return
      }

      const restored = restoreWorkoutCheckpoint(
        checkpointRoutineId,
        buildWorkoutSequence(recoveryRoutine.timing),
        Date.now(),
        performance.now(),
      )
      if (restored === undefined) {
        setScreen('home')
        return
      }

      setSelectedRoutine(recoveryRoutine)
      setInitialWorkout(
        restored.workout.status === 'complete'
          ? undefined
          : restored.workout,
      )
      setInitialActiveElapsedMs(restored.activeElapsedMs)
      setCompletedWorkoutMs(
        restored.workout.status === 'complete'
          ? restored.activeElapsedMs
          : 0,
      )
      setRecoveryMessage(restored.notice)
      setRecoveryWarning(restored.accuracyWarning)
      setScreen(
        restored.workout.status === 'complete' ? 'complete' : 'active',
      )
    }

    void loadRoutines()
      .then(showLoadedRoutines)
      .catch(() => {
        if (!active) return
        setStorageNotice(
          'Saved routines are unavailable on this device. The protected preset remains usable.',
        )
        showLoadedRoutines([protectedStandardRoutine])
      })
    return () => {
      active = false
    }
  }, [loadRoutines])

  const dismissRecovery = () => {
    setRecoveryMessage(undefined)
    setRecoveryWarning(false)
  }

  if (screen === 'loading') {
    return (
      <Box
        component="main"
        sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}
      >
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <CircularProgress />
          <Typography color="text.secondary">Loading routines…</Typography>
        </Stack>
      </Box>
    )
  }

  if (screen === 'home') {
    return (
      <>
        <RoutineLibrary
          routines={routines}
          storageNotice={storageNotice}
          onSelect={(routine) => {
            setSelectedRoutine(routine)
            setScreen('preworkout')
          }}
        />
        <PwaUpdatePrompt activationAllowed />
      </>
    )
  }

  if (selectedRoutine === undefined) return null

  if (screen === 'active') {
    return (
      <>
        <WorkoutRunner
          key={selectedRoutine.id}
          phases={sequence}
          timing={selectedRoutine.timing}
          initialWorkout={initialWorkout}
          initialActiveElapsedMs={initialActiveElapsedMs}
          soundsEnabled={timerSoundsEnabled}
          wakeLockMessage={wakeLockMessage}
          recoveryMessage={recoveryMessage}
          recoveryWarning={recoveryWarning}
          onCheckpoint={(workout, activeElapsedMs) =>
            saveWorkoutCheckpoint(
              selectedRoutine.id,
              workout,
              activeElapsedMs,
            )
          }
          onComplete={(activeElapsedMs) => {
            saveWorkoutCheckpoint(
              selectedRoutine.id,
              { status: 'complete', phases: sequence },
              activeElapsedMs,
            )
            setCompletedWorkoutMs(activeElapsedMs)
            setInitialWorkout(undefined)
            setInitialActiveElapsedMs(0)
            setScreen('complete')
          }}
          onDismissRecovery={dismissRecovery}
          onEnd={() => {
            clearWorkoutCheckpoint()
            setInitialWorkout(undefined)
            setInitialActiveElapsedMs(0)
            dismissRecovery()
            setScreen('preworkout')
          }}
        />
        <PwaUpdatePrompt activationAllowed={false} />
      </>
    )
  }

  if (screen === 'complete') {
    return (
      <Box
        component="main"
        sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 3 }}
      >
        <Container maxWidth="sm">
          <Paper variant="outlined" sx={{ p: { xs: 3, sm: 5 }, textAlign: 'center' }}>
            <Stack spacing={3} sx={{ alignItems: 'center' }}>
              <Chip label="Workout complete" color="primary" />
              <Typography variant="h1" sx={{ fontSize: { xs: '3rem', sm: '4.5rem' } }}>
                Complete
              </Typography>
              <Typography variant="h5" color="text.secondary">
                The wheel is conquered.
              </Typography>
              <Typography>
                Workout time: {formatClock(completedWorkoutMs)}
              </Typography>
              {wakeLockMessage && (
                <Typography color="warning.main">{wakeLockMessage}</Typography>
              )}
              {recoveryMessage && (
                <Typography
                  color={recoveryWarning ? 'warning.main' : 'info.main'}
                  role="status"
                >
                  {recoveryMessage}
                </Typography>
              )}
              <Button
                variant="contained"
                size="large"
                onClick={() => {
                  clearWorkoutCheckpoint()
                  dismissRecovery()
                  setScreen('preworkout')
                }}
              >
                Done
              </Button>
            </Stack>
          </Paper>
        </Container>
        <PwaUpdatePrompt activationAllowed />
      </Box>
    )
  }

  return (
    <>
      <PreWorkoutReview
        routine={selectedRoutine}
        onBack={() => {
          setSelectedRoutine(undefined)
          setScreen('home')
        }}
        onPlay={() => {
          clearWorkoutCheckpoint()
          setInitialWorkout(undefined)
          setInitialActiveElapsedMs(0)
          dismissRecovery()
          primeTimerAudio()
          setScreen('active')
        }}
      />
      <PwaUpdatePrompt activationAllowed />
    </>
  )
}
