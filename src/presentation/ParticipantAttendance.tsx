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
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import {
  crewMotivationStyles,
  emptyCrewProfile,
  participantMotivationStyles,
  type CrewProfile,
  type Participant,
  type ParticipantInput,
} from '../domain/participants/types'

interface ParticipantAttendanceProps {
  readonly participants: readonly Participant[]
  readonly activeIds: readonly string[]
  readonly crewProfile?: CrewProfile
  readonly storageNotice?: string
  readonly onBack: () => void
  readonly onSave: (activeIds: readonly string[]) => Promise<void>
  readonly onAdd: (input: ParticipantInput) => Promise<Participant>
  readonly onUpdate?: (id: string, input: ParticipantInput) => Promise<Participant>
  readonly onRename?: (id: string, name: string) => Promise<Participant>
  readonly onSaveCrewProfile?: (profile: CrewProfile) => Promise<void>
  readonly onDelete: (id: string) => Promise<void>
}

export function ParticipantAttendance({
  participants,
  activeIds,
  crewProfile = emptyCrewProfile,
  storageNotice,
  onBack,
  onSave,
  onAdd,
  onUpdate,
  onRename,
  onSaveCrewProfile = async () => undefined,
  onDelete,
}: ParticipantAttendanceProps) {
  const [active, setActive] = useState(() => new Set(activeIds))
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState<{
    readonly participant: Participant
    readonly input: ParticipantInput
  }>()
  const [crew, setCrew] = useState(crewProfile)
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
                        setEditing({
                          participant,
                          input: {
                            name: participant.name,
                            spokenName: participant.spokenName,
                            about: participant.about,
                            motivationStyle: participant.motivationStyle,
                            avoid: participant.avoid,
                          },
                        })
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
              Profiles are reused when generating crew-personalized sayings.
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
                  const participant = await onAdd({ name: newName })
                  setActive((current) => new Set([...current, participant.id]))
                  setNewName('')
                })
              }
            >
              Add
            </Button>
          </Stack>

          <Divider />
          <Stack spacing={2}>
            <Stack spacing={0.5}>
              <Typography variant="h5">Crew profile</Typography>
              <Typography variant="body2" color="text.secondary">
                Shared context and running jokes used for personalized generation.
              </Typography>
            </Stack>
            <TextField
              label="Crew name"
              value={crew.name}
              onChange={(event) => setCrew({ ...crew, name: event.target.value })}
              slotProps={{ htmlInput: { maxLength: 80 } }}
            />
            <TextField
              multiline
              minRows={3}
              label="About the crew"
              value={crew.about}
              onChange={(event) => setCrew({ ...crew, about: event.target.value })}
              slotProps={{ htmlInput: { maxLength: 2_000 } }}
            />
            <TextField
              select
              label="Crew motivation style"
              value={crew.motivationStyle}
              onChange={(event) => setCrew({
                ...crew,
                motivationStyle: event.target.value as CrewProfile['motivationStyle'],
              })}
            >
              {crewMotivationStyles.map((style) => (
                <MenuItem key={style} value={style}>
                  {`${style[0].toUpperCase()}${style.slice(1)}`}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              multiline
              minRows={2}
              label="Crew-wide things to avoid"
              value={crew.avoid}
              onChange={(event) => setCrew({ ...crew, avoid: event.target.value })}
              slotProps={{ htmlInput: { maxLength: 1_000 } }}
            />
            <Button
              variant="outlined"
              disabled={busy}
              onClick={() => void run(() => onSaveCrewProfile(crew))}
            >
              Save crew profile
            </Button>
          </Stack>
        </Stack>
      </Container>

      <Dialog open={editing !== undefined} onClose={() => setEditing(undefined)} fullWidth>
        <DialogTitle>Edit participant</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            autoFocus
            fullWidth
            label="Participant name"
            value={editing?.input.name ?? ''}
            onChange={(event) =>
              setEditing((current) =>
                current === undefined
                  ? undefined
                  : { ...current, input: { ...current.input, name: event.target.value } },
              )
            }
            sx={{ mt: 1 }}
          />
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Spoken name"
              helperText="Optional pronunciation-friendly spelling or nickname."
              value={editing?.input.spokenName ?? ''}
              onChange={(event) =>
                setEditing((current) => current === undefined ? undefined : {
                  ...current,
                  input: { ...current.input, spokenName: event.target.value },
                })
              }
            />
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="About them"
              value={editing?.input.about ?? ''}
              onChange={(event) =>
                setEditing((current) => current === undefined ? undefined : {
                  ...current,
                  input: { ...current.input, about: event.target.value },
                })
              }
            />
            <TextField
              select
              fullWidth
              label="Motivation style"
              value={editing?.input.motivationStyle ?? 'crew-default'}
              onChange={(event) =>
                setEditing((current) => current === undefined ? undefined : {
                  ...current,
                  input: {
                    ...current.input,
                    motivationStyle: event.target.value as ParticipantInput['motivationStyle'],
                  },
                })
              }
            >
              {participantMotivationStyles.map((style) => (
                <MenuItem key={style} value={style}>
                  {style === 'crew-default'
                    ? 'Use crew default'
                    : `${style[0].toUpperCase()}${style.slice(1)}`}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Things to avoid"
              value={editing?.input.avoid ?? ''}
              onChange={(event) =>
                setEditing((current) => current === undefined ? undefined : {
                  ...current,
                  input: { ...current.input, avoid: event.target.value },
                })
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(undefined)}>Cancel</Button>
          <Button
            disabled={busy || editing?.input.name.trim().length === 0}
            onClick={() =>
              void run(async () => {
                if (!editing) return
                if (onUpdate) await onUpdate(editing.participant.id, editing.input)
                else if (onRename) {
                  await onRename(editing.participant.id, editing.input.name)
                }
                setEditing(undefined)
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

