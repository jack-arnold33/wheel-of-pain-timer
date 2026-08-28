import { useEffect, useRef, useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import {
  beginResumeCountdown,
  currentPhase,
  pauseWorkout,
  projectWorkout,
  remainingPhaseMs,
  resumeCountdownRemainingMs,
  skipPhase,
  startWorkout,
} from '../domain/timer/engine'
import type { RoutineTiming, WorkoutPhase, WorkoutState } from '../domain/timer/types'
import {
  formatClock,
  nextPhase,
  phaseLabel,
  phasePosition,
  remainingScheduledMs,
  workIntervalsRemaining,
} from './timerPresentation'

interface WorkoutRunnerProps {
  phases: readonly WorkoutPhase[]
  timing: RoutineTiming
  wakeLockMessage?: string
  onComplete: (activeElapsedMs: number) => void
  onEnd: () => void
}

const now = () => performance.now()

export function WorkoutRunner({
  phases,
  timing,
  wakeLockMessage,
  onComplete,
  onEnd,
}: WorkoutRunnerProps) {
  const [workout, setWorkout] = useState<WorkoutState>(() => startWorkout(phases, now()))
  const [clockMs, setClockMs] = useState(() => now())
  const [confirmingEnd, setConfirmingEnd] = useState(false)
  const activeElapsedMs = useRef(0)
  const completionReported = useRef(false)

  const advance = (state: WorkoutState, atMs: number): WorkoutState => {
    if (state.status !== 'running') return projectWorkout(state, atMs)
    activeElapsedMs.current += Math.min(
      Math.max(0, atMs - state.monotonicAnchorMs),
      remainingScheduledMs(state),
    )
    return projectWorkout(state, atMs)
  }

  useEffect(() => {
    const interval = window.setInterval(() => {
      const atMs = now()
      setClockMs(atMs)
      setWorkout((state) => advance(state, atMs))
    }, 100)
    return () => window.clearInterval(interval)
  })

  useEffect(() => {
    if (workout.status === 'complete' && !completionReported.current) {
      completionReported.current = true
      onComplete(activeElapsedMs.current)
    }
  }, [onComplete, workout.status])

  if (workout.status === 'complete') return null

  const phase = currentPhase(workout)
  if (phase === undefined) return null

  const remainingMs = remainingPhaseMs(workout)
  const followingPhase = nextPhase(workout.phases, workout.phaseIndex)
  const isPaused = workout.status === 'paused'
  const isResuming = workout.status === 'resuming'
  const progress = Math.min(100, Math.max(0, (workout.elapsedInPhaseMs / phase.durationMs) * 100))

  const pauseAt = (atMs: number) => {
    setClockMs(atMs)
    setWorkout((state) => {
      const advanced = advance(state, atMs)
      return pauseWorkout(advanced, atMs)
    })
  }

  const handlePrimaryControl = () => {
    const atMs = now()
    if (workout.status === 'running' || workout.status === 'resuming') {
      pauseAt(atMs)
      return
    }
    setClockMs(atMs)
    setWorkout((state) => beginResumeCountdown(state, atMs))
  }

  const handleSkip = () => {
    const atMs = now()
    setClockMs(atMs)
    setWorkout((state) => skipPhase(advance(state, atMs), atMs))
  }

  const handleOpenEnd = () => {
    const atMs = now()
    pauseAt(atMs)
    setConfirmingEnd(true)
  }

  return (
    <Box
      component="main"
      sx={{
        height: '100dvh',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflowY: 'auto',
        pl: 'max(16px, env(safe-area-inset-left))',
        pr: 'max(16px, env(safe-area-inset-right))',
        pt: 'max(16px, env(safe-area-inset-top))',
        pb: 'max(16px, env(safe-area-inset-bottom))',
        '@media (orientation: landscape) and (max-height: 500px)': {
          alignItems: 'flex-start',
          pt: 'max(8px, env(safe-area-inset-top))',
          pb: 'max(8px, env(safe-area-inset-bottom))',
        },
      }}
    >
      <Paper
        variant="outlined"
        sx={{
          width: 'min(100%, 64rem)',
          p: { xs: 2.5, sm: 4 },
          textAlign: 'center',
          '@media (orientation: landscape) and (max-height: 500px)': {
            p: 1.5,
          },
        }}
      >
        <Stack
          spacing={{ xs: 2, sm: 3 }}
          sx={{
            alignItems: 'stretch',
            '@media (orientation: landscape) and (max-height: 500px)': {
              gap: 1,
            },
          }}
        >
          <Box
            sx={{
              '@media (orientation: landscape) and (max-height: 500px)': {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
              },
            }}
          >
            <Typography
              aria-label="Time remaining"
              sx={{
                color: 'primary.main',
                fontSize: { xs: '5rem', sm: '8rem' },
                fontWeight: 900,
                lineHeight: 0.95,
                fontVariantNumeric: 'tabular-nums',
                '@media (orientation: landscape) and (max-height: 500px)': {
                  fontSize: '4rem',
                },
              }}
            >
              {formatClock(remainingMs)}
            </Typography>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2rem', sm: '3.25rem' },
                mt: 1,
                '@media (orientation: landscape) and (max-height: 500px)': {
                  fontSize: '2rem',
                  mt: 0,
                },
              }}
            >
              {phaseLabel(phase.kind)}
            </Typography>
            {isPaused && <Typography color="primary.main" variant="h6">Paused</Typography>}
            {isResuming && (
              <Typography color="primary.main" variant="h6" aria-live="assertive">
                Resuming in {Math.max(1, Math.ceil(resumeCountdownRemainingMs(workout, clockMs) / 1_000))}
              </Typography>
            )}
          </Box>

          <LinearProgress variant="determinate" value={progress} aria-label="Current phase progress" />

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ justifyContent: 'space-between' }}
          >
            <Typography variant="h6">
              {workIntervalsRemaining(workout)} work intervals remaining
            </Typography>
            <Typography color="text.secondary">{phasePosition(phase, timing)}</Typography>
          </Stack>

          <Typography color="text.secondary">
            {followingPhase ? `Next: ${phaseLabel(followingPhase.kind)}` : 'Next: Complete'}
          </Typography>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ justifyContent: 'center' }}
          >
            <Button variant="contained" size="large" onClick={handlePrimaryControl}>
              {workout.status === 'running' || isResuming ? 'Pause' : 'Resume'}
            </Button>
            <Button variant="outlined" size="large" onClick={handleSkip}>Skip phase</Button>
            <Button color="error" size="large" onClick={handleOpenEnd}>End workout</Button>
          </Stack>

          {wakeLockMessage && (
            <Typography variant="body2" color="warning.main" role="status">
              {wakeLockMessage}
            </Typography>
          )}
        </Stack>
      </Paper>

      <Dialog open={confirmingEnd} onClose={() => setConfirmingEnd(false)}>
        <DialogTitle>End workout?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Current progress will be discarded. The workout will remain paused if you keep it.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmingEnd(false)}>Keep workout paused</Button>
          <Button color="error" variant="contained" onClick={onEnd}>End workout</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
