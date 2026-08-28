import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'
import { useState } from 'react'
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
  readonly onCustomize: () => void
  readonly onEdit: () => void
  readonly onDuplicate: () => void
  readonly onDelete: () => Promise<void>
  readonly personalityName: string | null
  readonly onChoosePersonality: () => void
}

const durationLabel = (seconds: number) =>
  seconds < 60 ? `${seconds} sec` : formatClock(seconds * 1_000)

export function PreWorkoutReview({
  routine,
  onBack,
  onPlay,
  onCustomize,
  onEdit,
  onDuplicate,
  onDelete,
  personalityName,
  onChoosePersonality,
}: PreWorkoutReviewProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(false)
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
              <Button
                color="inherit"
                aria-label="Choose Personality"
                onClick={onChoosePersonality}
                sx={{ justifyContent: 'space-between', textTransform: 'none' }}
              >
                <Typography>Personality</Typography>
                <Typography color="text.secondary">
                  {personalityName ?? 'None'}
                </Typography>
              </Button>
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography>Participants</Typography>
                <Typography color="text.secondary">0 active</Typography>
              </Stack>
              <Button variant="contained" size="large" onClick={onPlay}>
                Play
              </Button>
              {routine.ownership === 'protected' ? (
                <Button variant="outlined" onClick={onCustomize}>
                  Customize
                </Button>
              ) : (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button variant="outlined" onClick={onEdit} sx={{ flex: 1 }}>
                    Edit
                  </Button>
                  <Button variant="outlined" onClick={onDuplicate} sx={{ flex: 1 }}>
                    Duplicate
                  </Button>
                  <Button color="error" onClick={() => setConfirmDelete(true)} sx={{ flex: 1 }}>
                    Delete
                  </Button>
                </Stack>
              )}
            </Stack>
          </Paper>
        </Stack>
      </Container>
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>Delete {routine.name}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This removes the routine from this device and cannot be undone.
          </DialogContentText>
          {deleteError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              The routine could not be deleted from this device. Try again.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button
            color="error"
            disabled={deleting}
            onClick={() => {
              setDeleting(true)
              setDeleteError(false)
              void onDelete()
                .then(() => setConfirmDelete(false))
                .catch(() => {
                  setDeleting(false)
                  setDeleteError(true)
                })
            }}
          >
            {deleting ? 'Deleting…' : 'Delete routine'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
