import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import type { Participant } from '../domain/participants/types'

interface ParticipantAttendanceProps {
  readonly participants: readonly Participant[]
  readonly activeIds: readonly string[]
  readonly storageNotice?: string
  readonly onBack: () => void
  readonly onSave: (activeIds: readonly string[]) => Promise<void>
  readonly onAdd: (name: string) => Promise<Participant>
  readonly onRename: (id: string, name: string) => Promise<Participant>
  readonly onDelete: (id: string) => Promise<void>
}

export function ParticipantAttendance({
  participants,
  activeIds,
  storageNotice,
  onBack,
  onSave,
  onAdd,
  onRename,
  onDelete,
}: ParticipantAttendanceProps) {
  const [active, setActive] = useState(() => new Set(activeIds))
  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState<{
    readonly participant: Participant
    readonly name: string
  }>()
  const [deleting, setDeleting] = useState<Participant>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError(undefined)
    try {
      await action()
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'The participant change could not be saved.',
      )
    } finally {
      setBusy(false)
    }
  }

  const toggle = (id: string) => {
    setActive((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <Box component="main" sx={{ minHeight: '100dvh', py: { xs: 3, sm: 6 } }}>
      <Container maxWidth="sm">
        <Stack spacing={3}>
          <Button startIcon={<ArrowBackRoundedIcon />} onClick={onBack} sx={{ alignSelf: 'flex-start' }}>
            Workout
          </Button>
          <Stack spacing={1}>
            <Typography variant="h1" sx={{ fontSize: { xs: '2.25rem', sm: '3.25rem' } }}>
              Participants
            </Typography>
            <Typography color="text.secondary">
              Choose who is active for this workout. Attendance is remembered on this device.
            </Typography>
          </Stack>

          {storageNotice && <Alert severity="warning">{storageNotice}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}

          {participants.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="h6">No participants yet</Typography>
              <Typography color="text.secondary">
                Add a name below, or continue with sayings that do not address anyone.
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={1} aria-label="Participant attendance">
              {participants.map((participant) => (
                <Paper key={participant.id} variant="outlined" sx={{ px: 1.5, py: 0.5 }}>
                  <Stack direction="row" sx={{ alignItems: 'center' }}>
                    <FormControlLabel
                      sx={{ flex: 1, m: 0 }}
                      control={
                        <Checkbox
                          checked={active.has(participant.id)}
                          onChange={() => toggle(participant.id)}
                        />
                      }
                      label={participant.name}
                    />
                    <IconButton
                      aria-label={`Rename ${participant.name}`}
                      onClick={() =>
                        setRenaming({ participant, name: participant.name })
                      }
                    >
                      <EditRoundedIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      aria-label={`Remove ${participant.name}`}
                      onClick={() => setDeleting(participant)}
                    >
                      <DeleteOutlineRoundedIcon />
                    </IconButton>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}

          <Button
            variant="contained"
            size="large"
            disabled={busy}
            onClick={() => void run(() => onSave([...active]))}
          >
            Save attendance · {active.size} active
          </Button>

          <Divider />
          <Stack spacing={1}>
            <Typography variant="h5">Manage roster</Typography>
            <Typography variant="body2" color="text.secondary">
              Names are independent of routines and Personality packs.
            </Typography>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              label="New participant"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              sx={{ flex: 1 }}
            />
            <Button
              variant="outlined"
              disabled={busy || newName.trim().length === 0}
              onClick={() =>
                void run(async () => {
                  const participant = await onAdd(newName)
                  setActive((current) => new Set([...current, participant.id]))
                  setNewName('')
                })
              }
            >
              Add
            </Button>
          </Stack>
        </Stack>
      </Container>

      <Dialog open={renaming !== undefined} onClose={() => setRenaming(undefined)} fullWidth>
        <DialogTitle>Rename participant</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            autoFocus
            fullWidth
            label="Participant name"
            value={renaming?.name ?? ''}
            onChange={(event) =>
              setRenaming((current) =>
                current === undefined ? undefined : { ...current, name: event.target.value },
              )
            }
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenaming(undefined)}>Cancel</Button>
          <Button
            disabled={busy || renaming?.name.trim().length === 0}
            onClick={() =>
              void run(async () => {
                if (!renaming) return
                await onRename(renaming.participant.id, renaming.name)
                setRenaming(undefined)
              })
            }
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleting !== undefined} onClose={() => setDeleting(undefined)}>
        <DialogTitle>Remove {deleting?.name}?</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <DialogContentText>
            This removes the participant and their remembered attendance from this device.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(undefined)}>Cancel</Button>
          <Button
            color="error"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                if (!deleting) return
                await onDelete(deleting.id)
                setActive((current) => {
                  const next = new Set(current)
                  next.delete(deleting.id)
                  return next
                })
                setDeleting(undefined)
              })
            }
          >
            Remove participant
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

