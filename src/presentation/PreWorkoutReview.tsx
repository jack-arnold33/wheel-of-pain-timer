import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
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
import type { Routine } from '../domain/routines/types'
import {
  calculateScheduledSeconds,
  calculateWorkIntervals,
} from '../domain/timer/validation'
import { formatClock } from './timerPresentation'

interface PreWorkoutReviewProps {
  readonly routine: Routine
  readonly onBack: () => void
  readonly onPlay: () => void
}

const durationLabel = (seconds: number) =>
  seconds < 60 ? `${seconds} sec` : formatClock(seconds * 1_000)

export function PreWorkoutReview({
  routine,
  onBack,
  onPlay,
}: PreWorkoutReviewProps) {
  const { timing } = routine
  return (
    <Box component="main" sx={{ minHeight: '100dvh', py: { xs: 3, sm: 6 } }}>
      <Container maxWidth="sm">
        <Stack spacing={3}>
          <Button
            startIcon={<ArrowBackRoundedIcon />}
            onClick={onBack}
            sx={{ alignSelf: 'flex-start' }}
          >
            Routines
          </Button>

          <Stack spacing={1}>
            <Chip
              label={
                routine.ownership === 'protected'
                  ? 'Protected preset'
                  : 'Saved on this device'
              }
              color={routine.ownership === 'protected' ? 'primary' : 'default'}
              sx={{ alignSelf: 'flex-start' }}
            />
            <Typography variant="h1" sx={{ fontSize: { xs: '2.5rem', sm: '3.5rem' } }}>
              {routine.name}
            </Typography>
            <Typography color="text.secondary">
              Review this routine, then begin the Prepare phase.
            </Typography>
          </Stack>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Stack direction="row" divider={<Divider orientation="vertical" flexItem />} spacing={2}>
                <Box>
                  <Typography variant="h5">
                    {calculateWorkIntervals(timing)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Work intervals
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h5">
                    {formatClock(calculateScheduledSeconds(timing) * 1_000)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total duration
                  </Typography>
                </Box>
              </Stack>
              <Typography color="text.secondary">
                {timing.cycles} cycles · {timing.roundsPerCycle} rounds ·{' '}
                {timing.exercisesPerRound} exercises
              </Typography>
              <Typography color="text.secondary">
                {durationLabel(timing.prepareSeconds)} prepare ·{' '}
                {durationLabel(timing.workSeconds)} work ·{' '}
                {durationLabel(timing.exerciseRestSeconds)} rest ·{' '}
                {durationLabel(timing.cycleRestSeconds)} cycle rest ·{' '}
                {durationLabel(timing.cooldownSeconds)} cooldown
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
              <Button variant="contained" size="large" onClick={onPlay}>
                Play
              </Button>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Box>
  )
}
