import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { buildWorkoutSequence } from './domain/timer/sequence'
import { standardRoutineTiming } from './domain/timer/standardRoutine'
import type { WorkoutState } from './domain/timer/types'
import {
  clearWorkoutCheckpoint,
  restoreWorkoutCheckpoint,
  saveWorkoutCheckpoint,
} from './domain/timer/workoutPersistence'
import { PwaUpdatePrompt } from './presentation/PwaUpdatePrompt'
import { WorkoutRunner } from './presentation/WorkoutRunner'
import { formatClock } from './presentation/timerPresentation'
import { primeTimerAudio } from './presentation/timerAudio'
import { useScreenWakeLock, wakeLockNotice } from './presentation/useScreenWakeLock'

type Screen = 'preworkout' | 'active' | 'complete'
const STANDARD_ROUTINE_ID = 'protected-standard'

export function App() {
  const sequence = useMemo(
    () => buildWorkoutSequence(standardRoutineTiming),
    [],
  )
  const [restoredWorkout] = useState(() =>
    restoreWorkoutCheckpoint(
      STANDARD_ROUTINE_ID,
      sequence,
      Date.now(),
      performance.now(),
    ),
  )
  const [initialWorkout, setInitialWorkout] = useState<WorkoutState | undefined>(
    restoredWorkout?.workout.status === 'complete'
      ? undefined
      : restoredWorkout?.workout,
  )
  const [initialActiveElapsedMs, setInitialActiveElapsedMs] = useState(
    restoredWorkout?.activeElapsedMs ?? 0,
  )
  const [recoveryMessage, setRecoveryMessage] = useState(restoredWorkout?.notice)
  const [recoveryWarning, setRecoveryWarning] = useState(
    restoredWorkout?.accuracyWarning ?? false,
  )
  const [screen, setScreen] = useState<Screen>(() => {
    if (restoredWorkout?.workout.status === 'complete') return 'complete'
    return restoredWorkout === undefined ? 'preworkout' : 'active'
  })
  const [completedWorkoutMs, setCompletedWorkoutMs] = useState(
    restoredWorkout?.workout.status === 'complete'
      ? restoredWorkout.activeElapsedMs
      : 0,
  )
  const wakeLockStatus = useScreenWakeLock(screen !== 'preworkout')
  const wakeLockMessage = wakeLockNotice(wakeLockStatus)

  const workIntervals = sequence.filter(({ kind }) => kind === 'work').length
  const scheduledDurationMs = sequence.reduce(
    (total, phase) => total + phase.durationMs,
    0,
  )

  if (screen === 'active') {
    return (
      <>
        <WorkoutRunner
          phases={sequence}
          timing={standardRoutineTiming}
          initialWorkout={initialWorkout}
          initialActiveElapsedMs={initialActiveElapsedMs}
          wakeLockMessage={wakeLockMessage}
          recoveryMessage={recoveryMessage}
          recoveryWarning={recoveryWarning}
          onCheckpoint={(workout, activeElapsedMs) =>
            saveWorkoutCheckpoint(
              STANDARD_ROUTINE_ID,
              workout,
              activeElapsedMs,
            )
          }
          onComplete={(activeElapsedMs) => {
            saveWorkoutCheckpoint(
              STANDARD_ROUTINE_ID,
              { status: 'complete', phases: sequence },
              activeElapsedMs,
            )
            setCompletedWorkoutMs(activeElapsedMs)
            setInitialWorkout(undefined)
            setInitialActiveElapsedMs(0)
            setScreen('complete')
          }}
          onDismissRecovery={() => {
            setRecoveryMessage(undefined)
            setRecoveryWarning(false)
          }}
          onEnd={() => {
            clearWorkoutCheckpoint()
            setInitialWorkout(undefined)
            setInitialActiveElapsedMs(0)
            setRecoveryMessage(undefined)
            setRecoveryWarning(false)
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
                  setRecoveryMessage(undefined)
                  setRecoveryWarning(false)
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
    <Box component="main" sx={{ minHeight: '100dvh', py: { xs: 4, sm: 8 } }}>
      <Container maxWidth="sm">
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Chip label="Protected preset" color="primary" sx={{ alignSelf: 'flex-start' }} />
            <Typography variant="h1" sx={{ fontSize: { xs: '2.5rem', sm: '3.5rem' } }}>
              Wheel of Pain
            </Typography>
            <Typography color="text.secondary">
              Review the standard routine, then begin the Prepare phase.
            </Typography>
          </Stack>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h6">Standard routine</Typography>
              <Stack direction="row" divider={<Divider orientation="vertical" flexItem />} spacing={2}>
                <Box>
                  <Typography variant="h5">{workIntervals}</Typography>
                  <Typography variant="body2" color="text.secondary">Work intervals</Typography>
                </Box>
                <Box>
                  <Typography variant="h5">{formatClock(scheduledDurationMs)}</Typography>
                  <Typography variant="body2" color="text.secondary">Total duration</Typography>
                </Box>
              </Stack>
              <Typography color="text.secondary">
                4 cycles · 4 rounds · 3 exercises
              </Typography>
              <Typography color="text.secondary">
                10 sec prepare · 30 sec work · 15 sec rest · 2 min cycle rest
              </Typography>
              <Divider />
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography>Personality</Typography>
                <Typography color="text.secondary">None</Typography>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography>Participants</Typography>
                <Typography color="text.secondary">0 active</Typography>
              </Stack>
              <Button
                variant="contained"
                size="large"
                onClick={() => {
                  clearWorkoutCheckpoint()
                  setInitialWorkout(undefined)
                  setInitialActiveElapsedMs(0)
                  setRecoveryMessage(undefined)
                  setRecoveryWarning(false)
                  primeTimerAudio()
                  setScreen('active')
                }}
              >
                Play
              </Button>
            </Stack>
          </Paper>
        </Stack>
      </Container>
      <PwaUpdatePrompt activationAllowed />
    </Box>
  )
}
