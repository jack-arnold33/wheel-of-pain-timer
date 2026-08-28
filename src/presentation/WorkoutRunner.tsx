import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  LinearProgress,
  Paper,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import PauseRoundedIcon from '@mui/icons-material/PauseRounded'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import SkipNextRoundedIcon from '@mui/icons-material/SkipNextRounded'
import StopRoundedIcon from '@mui/icons-material/StopRounded'
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
import type { ContentPack } from '../domain/contentPacks/types'
import type { Participant } from '../domain/participants/types'
import { MotivationSession } from '../domain/motivation/session'
import {
  formatClock,
  nextPhase,
  phaseLabel,
  phasePositionLines,
  remainingScheduledMs,
  workIntervalsRemaining,
} from './timerPresentation'
import { playTimerCues, primeTimerAudio } from './timerAudio'
import { timerCueFrame, timerCuesBetween } from './timerCues'
import { motivationCategoryBetween } from './motivationCues'
import {
  speakMotivation,
  type MotivationSpeechOptions,
} from './spokenMotivation'

export interface WorkoutMotivation {
  readonly pack: ContentPack
  readonly participants: readonly Participant[]
  readonly enabled: boolean
  readonly speech: MotivationSpeechOptions
}

interface WorkoutRunnerProps {
  phases: readonly WorkoutPhase[]
  timing: RoutineTiming
  initialWorkout?: WorkoutState
  initialActiveElapsedMs?: number
  soundsEnabled?: boolean
  motivation?: WorkoutMotivation
  wakeLockMessage?: string
  recoveryMessage?: string
  recoveryWarning?: boolean
  onCheckpoint: (workout: WorkoutState, activeElapsedMs: number) => void
  onComplete: (activeElapsedMs: number) => void
  onDismissRecovery: () => void
  onEnd: () => void
}

const now = () => performance.now()

export function WorkoutRunner({
  phases,
  timing,
  initialWorkout,
  initialActiveElapsedMs = 0,
  soundsEnabled = true,
  motivation,
  wakeLockMessage,
  recoveryMessage,
  recoveryWarning = false,
  onCheckpoint,
  onComplete,
  onDismissRecovery,
  onEnd,
}: WorkoutRunnerProps) {
  const [initialClockMs] = useState(now)
  const [workout, setWorkout] = useState<WorkoutState>(() =>
    initialWorkout ?? startWorkout(phases, initialClockMs),
  )
  const [clockMs, setClockMs] = useState(initialClockMs)
  const [confirmingEnd, setConfirmingEnd] = useState(false)
  const [motivationNotice, setMotivationNotice] = useState<string>()
  const [motivationSession] = useState(() =>
    motivation?.enabled
      ? new MotivationSession(motivation.pack, motivation.participants)
      : undefined,
  )
  const activeElapsedMs = useRef(initialActiveElapsedMs)
  const completionReported = useRef(false)
  const lastCheckpointAtMs = useRef(0)
  const lastCheckpointPosition = useRef('')
  const previousCueFrame = useRef<ReturnType<typeof timerCueFrame> | undefined>(
    initialWorkout === undefined
      ? undefined
      : timerCueFrame(initialWorkout, initialClockMs),
  )
  const previousMotivationFrame = useRef<
    ReturnType<typeof timerCueFrame> | undefined
  >(
    initialWorkout === undefined
      ? undefined
      : timerCueFrame(initialWorkout, initialClockMs),
  )

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
    const currentFrame = timerCueFrame(workout, clockMs)
    const category = motivationCategoryBetween(
      previousMotivationFrame.current,
      currentFrame,
      phases,
    )
    if (category !== undefined && motivationSession !== undefined && motivation) {
      const text = motivationSession.next(category)
      if (text !== undefined) {
        const result = speakMotivation(text, motivation.speech)
        if (result === 'unsupported') {
          setMotivationNotice('Spoken motivation is not supported by this browser.')
        } else if (result === 'no-eligible-voice') {
          setMotivationNotice(
            'Spoken motivation is unavailable because no eligible on-device voice was found.',
          )
        } else if (result === 'spoken-with-fallback') {
          setMotivationNotice(
            'The selected voice is unavailable. Spoken motivation is using the system default.',
          )
        }
      }
    }
    previousMotivationFrame.current = currentFrame
  }, [clockMs, motivation, motivationSession, phases, workout])

  useEffect(() => {
    if (workout.status === 'complete' && !completionReported.current) {
      completionReported.current = true
      onComplete(activeElapsedMs.current)
    }
  }, [onComplete, workout.status])

  useEffect(() => {
    if (workout.status === 'complete') return
    const position = `${workout.status}:${workout.phaseIndex}`
    const wallClockMs = Date.now()
    if (
      position !== lastCheckpointPosition.current ||
      wallClockMs - lastCheckpointAtMs.current >= 1_000
    ) {
      onCheckpoint(workout, activeElapsedMs.current)
      lastCheckpointPosition.current = position
      lastCheckpointAtMs.current = wallClockMs
    }
  }, [onCheckpoint, workout])

  useEffect(() => {
    const currentCueFrame = timerCueFrame(workout, clockMs)
    const cues = timerCuesBetween(previousCueFrame.current, currentCueFrame)
    if (soundsEnabled) playTimerCues(cues)
    previousCueFrame.current = currentCueFrame
  }, [clockMs, soundsEnabled, workout])

  useEffect(() => {
    const pauseInterruptedResume = () => {
      if (document.visibilityState === 'visible') return
      const atMs = now()
      setClockMs(atMs)
      setWorkout((state) =>
        state.status === 'resuming' ? pauseWorkout(state, atMs) : state,
      )
    }
    document.addEventListener('visibilitychange', pauseInterruptedResume)
    return () =>
      document.removeEventListener('visibilitychange', pauseInterruptedResume)
  }, [])

  if (workout.status === 'complete') return null

  const phase = currentPhase(workout)
  if (phase === undefined) return null

  const remainingMs = remainingPhaseMs(workout)
  const followingPhase = nextPhase(workout.phases, workout.phaseIndex)
  const isPaused = workout.status === 'paused'
  const isResuming = workout.status === 'resuming'
  const primaryControlLabel = workout.status === 'running' || isResuming ? 'Pause' : 'Resume'
  const progress = Math.min(100, Math.max(0, (workout.elapsedInPhaseMs / phase.durationMs) * 100))
  const positionLines = phasePositionLines(phase, timing)

  const pauseAt = (atMs: number) => {
    setClockMs(atMs)
    setWorkout((state) => {
      const advanced = advance(state, atMs)
      return pauseWorkout(advanced, atMs)
    })
  }

  const handlePrimaryControl = () => {
    primeTimerAudio()
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
        '@media (orientation: landscape) and (max-height: 600px)': {
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
          position: 'relative',
          textAlign: 'center',
          '@media (orientation: landscape) and (max-height: 600px)': {
            width: '100%',
            height: '100%',
            p: 0,
            border: 0,
            bgcolor: 'transparent',
          },
        }}
      >
        <Stack
          spacing={{ xs: 2, sm: 3 }}
          sx={{
            alignItems: 'stretch',
            '@media (orientation: landscape) and (max-height: 600px)': {
              height: '100%',
              gap: 0.75,
            },
          }}
        >
          <Box
            sx={{
              '@media (orientation: landscape) and (max-height: 600px)': {
                display: 'grid',
                gridTemplateRows: 'auto minmax(0, 1fr)',
                alignItems: 'center',
                justifyItems: 'center',
                flex: 1,
                minHeight: 0,
                position: 'relative',
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
                '@media (orientation: landscape) and (max-height: 600px)': {
                  gridRow: 2,
                  fontSize: 'clamp(8rem, 23vw, 12rem)',
                  lineHeight: 0.8,
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
                '@media (orientation: landscape) and (max-height: 600px)': {
                  gridRow: 1,
                  fontSize: 'clamp(2rem, 5vw, 3rem)',
                  whiteSpace: 'nowrap',
                  mt: 0,
                },
              }}
            >
              {phaseLabel(phase.kind)}
            </Typography>
            {isPaused && (
              <Typography
                color="primary.main"
                variant="h6"
                sx={{
                  '@media (orientation: landscape) and (max-height: 600px)': {
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    fontSize: '0.875rem',
                  },
                }}
              >
                Paused
              </Typography>
            )}
            {isResuming && (
              <Typography
                color="primary.main"
                variant="h6"
                aria-live="assertive"
                sx={{
                  '@media (orientation: landscape) and (max-height: 600px)': {
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    fontSize: '0.875rem',
                  },
                }}
              >
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
            <Typography sx={{ fontWeight: 700 }}>
              {workIntervalsRemaining(workout)} work intervals remaining
            </Typography>
            {positionLines.length > 0 && (
              <Stack
                spacing={0}
                aria-label="Workout position"
                sx={{ alignItems: { xs: 'center', sm: 'flex-end' } }}
              >
                {positionLines.map((line) => (
                  <Typography key={line} variant="body2" color="text.secondary">
                    {line}
                  </Typography>
                ))}
              </Stack>
            )}
          </Stack>

          <Stack
            direction="row"
            spacing={2}
            sx={{ alignItems: 'center', justifyContent: 'center' }}
          >
            <Typography variant="body2" color="text.secondary">
              {followingPhase ? `Next: ${phaseLabel(followingPhase.kind)}` : 'Next: Complete'}
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                '@media (orientation: landscape) and (max-height: 600px)': {
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  zIndex: 2,
                },
              }}
            >
              <Tooltip title={primaryControlLabel}>
                <IconButton
                  aria-label={primaryControlLabel}
                  onClick={handlePrimaryControl}
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': { bgcolor: 'primary.dark' },
                    '@media (orientation: landscape) and (max-height: 600px)': {
                      width: 44,
                      height: 44,
                    },
                  }}
                >
                  {primaryControlLabel === 'Pause' ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Skip phase">
                <IconButton
                  aria-label="Skip phase"
                  onClick={handleSkip}
                  sx={{
                    width: 48,
                    height: 48,
                    border: 1,
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    '@media (orientation: landscape) and (max-height: 600px)': {
                      width: 44,
                      height: 44,
                    },
                  }}
                >
                  <SkipNextRoundedIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="End workout">
                <IconButton
                  aria-label="End workout"
                  color="error"
                  onClick={handleOpenEnd}
                  sx={{
                    width: 48,
                    height: 48,
                    border: 1,
                    borderColor: 'error.main',
                    color: 'error.main',
                    '@media (orientation: landscape) and (max-height: 600px)': {
                      width: 44,
                      height: 44,
                    },
                  }}
                >
                  <StopRoundedIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

          {wakeLockMessage && (
            <Typography variant="body2" color="warning.main" role="status">
              {wakeLockMessage}
            </Typography>
          )}
          {motivationNotice && (
            <Typography variant="body2" color="warning.main" role="status">
              {motivationNotice}
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
      <Snackbar
        open={recoveryMessage !== undefined}
        autoHideDuration={6_000}
        onClose={onDismissRecovery}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={recoveryWarning ? 'warning' : 'info'}
          variant="filled"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                primeTimerAudio()
                onDismissRecovery()
              }}
            >
              Enable sound
            </Button>
          }
        >
          {recoveryMessage}
        </Alert>
      </Snackbar>
    </Box>
  )
}
