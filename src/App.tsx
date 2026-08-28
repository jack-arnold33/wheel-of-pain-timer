import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
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
import type { Routine, RoutineInput, UserRoutine } from './domain/routines/types'
import { standardRoutineTiming } from './domain/timer/standardRoutine'
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
import type { RoutineEditorMode } from './presentation/RoutineEditor'
import { WorkoutRunner } from './presentation/WorkoutRunner'
import { formatClock } from './presentation/timerPresentation'
import { primeTimerAudio } from './presentation/timerAudio'
import { useScreenWakeLock, wakeLockNotice } from './presentation/useScreenWakeLock'

type Screen = 'loading' | 'home' | 'editor' | 'preworkout' | 'active' | 'complete'
const LEGACY_STANDARD_ROUTINE_ID = 'protected-standard'
const RoutineEditor = lazy(async () => {
  const module = await import('./presentation/RoutineEditor')
  return { default: module.RoutineEditor }
})

interface EditorState {
  readonly mode: RoutineEditorMode
  readonly source?: Routine
}

interface AppProps {
  timerSoundsEnabled?: boolean
  loadRoutines?: () => Promise<readonly Routine[]>
  createRoutine?: (input: RoutineInput) => Promise<UserRoutine>
  updateRoutine?: (id: string, input: RoutineInput) => Promise<UserRoutine>
  deleteRoutine?: (id: string) => Promise<void>
}

const loadStoredRoutines = async () => {
  const { routineRepository } = await import('./data/routineRepository')
  return routineRepository.list()
}

const createStoredRoutine = async (input: RoutineInput) => {
  const { routineRepository } = await import('./data/routineRepository')
  return routineRepository.create(input)
}

const updateStoredRoutine = async (id: string, input: RoutineInput) => {
  const { routineRepository } = await import('./data/routineRepository')
  return routineRepository.update(id, input)
}

const deleteStoredRoutine = async (id: string) => {
  const { routineRepository } = await import('./data/routineRepository')
  return routineRepository.delete(id)
}

export function App({
  timerSoundsEnabled = true,
  loadRoutines = loadStoredRoutines,
  createRoutine = createStoredRoutine,
  updateRoutine = updateStoredRoutine,
  deleteRoutine = deleteStoredRoutine,
}: AppProps) {
  const [screen, setScreen] = useState<Screen>('loading')
  const [routines, setRoutines] = useState<readonly Routine[]>([])
  const [selectedRoutine, setSelectedRoutine] = useState<Routine>()
  const [editor, setEditor] = useState<EditorState>()
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
          onCreate={() => {
            setEditor({ mode: 'create' })
            setScreen('editor')
          }}
        />
        <PwaUpdatePrompt activationAllowed />
      </>
    )
  }

  if (screen === 'editor' && editor !== undefined) {
    const source = editor.source
    const initialName =
      editor.mode === 'create'
        ? ''
        : editor.mode === 'edit'
          ? (source?.name ?? '')
          : `${source?.name ?? 'Routine'} Copy`
    const initialTiming = source?.timing ?? standardRoutineTiming

    return (
      <>
        <Suspense
          fallback={
            <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
              <CircularProgress aria-label="Loading routine editor" />
            </Box>
          }
        >
          <RoutineEditor
            key={`${editor.mode}:${source?.id ?? 'new'}`}
            mode={editor.mode}
            initialName={initialName}
            initialTiming={initialTiming}
            onCancel={() => {
              setEditor(undefined)
              setScreen(source === undefined ? 'home' : 'preworkout')
            }}
            onSave={async (input) => {
              const saved =
                editor.mode === 'edit' && source?.ownership === 'user'
                  ? await updateRoutine(source.id, input)
                  : await createRoutine(input)
              setRoutines((current) =>
                editor.mode === 'edit'
                  ? current.map((routine) =>
                      routine.id === saved.id ? saved : routine,
                    )
                  : [...current, saved],
              )
              setSelectedRoutine(saved)
              setEditor(undefined)
              setScreen('preworkout')
            }}
          />
        </Suspense>
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
        onCustomize={() => {
          setEditor({ mode: 'customize', source: selectedRoutine })
          setScreen('editor')
        }}
        onEdit={() => {
          setEditor({ mode: 'edit', source: selectedRoutine })
          setScreen('editor')
        }}
        onDuplicate={() => {
          setEditor({ mode: 'duplicate', source: selectedRoutine })
          setScreen('editor')
        }}
        onDelete={async () => {
          try {
            await deleteRoutine(selectedRoutine.id)
            setRoutines((current) =>
              current.filter(({ id }) => id !== selectedRoutine.id),
            )
            setSelectedRoutine(undefined)
            setScreen('home')
          } catch (error) {
            setStorageNotice('The routine could not be deleted from this device.')
            throw error
          }
        }}
      />
      <PwaUpdatePrompt activationAllowed />
    </>
  )
}
