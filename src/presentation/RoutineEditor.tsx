import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import type { RoutineInput } from '../domain/routines/types'
import type { RoutineTiming } from '../domain/timer/types'
import {
  calculateScheduledSeconds,
  calculateWorkIntervals,
  validateRoutineTiming,
} from '../domain/timer/validation'
import { formatClock } from './timerPresentation'

export type RoutineEditorMode = 'create' | 'customize' | 'edit' | 'duplicate'

interface RoutineEditorProps {
  readonly mode: RoutineEditorMode
  readonly initialName: string
  readonly initialTiming: RoutineTiming
  readonly onCancel: () => void
  readonly onSave: (input: RoutineInput) => Promise<void>
}

type DurationField =
  | 'prepareSeconds'
  | 'workSeconds'
  | 'exerciseRestSeconds'
  | 'cycleRestSeconds'
  | 'cooldownSeconds'
type CountField = 'exercisesPerRound' | 'roundsPerCycle' | 'cycles'

const durationFields: readonly [DurationField, string][] = [
  ['prepareSeconds', 'Prepare'],
  ['workSeconds', 'Work'],
  ['exerciseRestSeconds', 'Exercise rest'],
  ['cycleRestSeconds', 'Cycle rest'],
  ['cooldownSeconds', 'Cooldown'],
]

const countFields: readonly [CountField, string][] = [
  ['exercisesPerRound', 'Exercises per round'],
  ['roundsPerCycle', 'Rounds per cycle'],
  ['cycles', 'Cycles'],
]

const formatDurationInput = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`

const parseDuration = (value: string) => {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(value.trim())
  if (match === null) return undefined
  const minutes = Number(match[1])
  const seconds = Number(match[2])
  if (minutes > 59) return undefined
  return minutes * 60 + seconds
}

const titleByMode: Record<RoutineEditorMode, string> = {
  create: 'Create routine',
  customize: 'Customize routine',
  edit: 'Edit routine',
  duplicate: 'Duplicate routine',
}

export function RoutineEditor({
  mode,
  initialName,
  initialTiming,
  onCancel,
  onSave,
}: RoutineEditorProps) {
  const [name, setName] = useState(initialName)
  const [durations, setDurations] = useState<Record<DurationField, string>>(() =>
    Object.fromEntries(
      durationFields.map(([field]) => [field, formatDurationInput(initialTiming[field])]),
    ) as Record<DurationField, string>,
  )
  const [counts, setCounts] = useState<Record<CountField, string>>(() =>
    Object.fromEntries(
      countFields.map(([field]) => [field, initialTiming[field].toString()]),
    ) as Record<CountField, string>,
  )
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string>()

  const parsed = useMemo(() => {
    const timing = {} as RoutineTiming
    const fieldErrors: Partial<Record<keyof RoutineTiming, string>> = {}

    for (const [field] of durationFields) {
      const value = parseDuration(durations[field])
      if (value === undefined) {
        fieldErrors[field] = 'Use MM:SS, up to 59:59.'
        timing[field] = 0
      } else {
        timing[field] = value
      }
    }
    for (const [field] of countFields) {
      const value = Number(counts[field])
      if (!/^\d+$/.test(counts[field]) || !Number.isInteger(value)) {
        fieldErrors[field] = 'Enter a whole number from 1 through 99.'
        timing[field] = 0
      } else {
        timing[field] = value
      }
    }

    const issues = validateRoutineTiming(timing)
    const aggregateErrors: string[] = []
    for (const issue of issues) {
      if (issue.field === 'workIntervals' || issue.field === 'scheduledSeconds') {
        aggregateErrors.push(issue.message)
      } else if (fieldErrors[issue.field] === undefined) {
        fieldErrors[issue.field] = issue.message
      }
    }
    return { timing, fieldErrors, aggregateErrors }
  }, [counts, durations])

  const nameError = name.trim().length === 0 ? 'Enter a routine name.' : undefined
  const hasErrors =
    nameError !== undefined ||
    Object.keys(parsed.fieldErrors).length > 0 ||
    parsed.aggregateErrors.length > 0

  const save = async () => {
    if (hasErrors || saving) return
    setSaving(true)
    setSaveError(undefined)
    try {
      await onSave({ name: name.trim(), timing: parsed.timing })
    } catch {
      setSaveError('The routine could not be saved on this device. Try again.')
      setSaving(false)
    }
  }

  return (
    <Box component="main" sx={{ minHeight: '100dvh', py: { xs: 3, sm: 6 } }}>
      <Container maxWidth="sm">
        <Stack spacing={3}>
          <Button
            startIcon={<ArrowBackRoundedIcon />}
            onClick={onCancel}
            sx={{ alignSelf: 'flex-start' }}
          >
            Cancel
          </Button>

          <Stack spacing={1}>
            <Typography variant="h1" sx={{ fontSize: { xs: '2.25rem', sm: '3.25rem' } }}>
              {titleByMode[mode]}
            </Typography>
            <Typography color="text.secondary">
              Optional phases may be 00:00. Work and all counts must be positive.
            </Typography>
          </Stack>

          {saveError && <Alert severity="error">{saveError}</Alert>}

          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack spacing={3}>
              <TextField
                label="Routine name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                error={nameError !== undefined}
                helperText={nameError ?? 'Stored only on this device.'}
                autoFocus
              />

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' },
                  gap: 2,
                }}
              >
                {durationFields.map(([field, label]) => (
                  <TextField
                    key={field}
                    label={label}
                    value={durations[field]}
                    onChange={(event) =>
                      setDurations((current) => ({
                        ...current,
                        [field]: event.target.value,
                      }))
                    }
                    error={parsed.fieldErrors[field] !== undefined}
                    helperText={parsed.fieldErrors[field] ?? 'MM:SS'}
                    slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                  />
                ))}
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                  gap: 2,
                }}
              >
                {countFields.map(([field, label]) => (
                  <TextField
                    key={field}
                    label={label}
                    type="number"
                    value={counts[field]}
                    onChange={(event) =>
                      setCounts((current) => ({
                        ...current,
                        [field]: event.target.value,
                      }))
                    }
                    error={parsed.fieldErrors[field] !== undefined}
                    helperText={parsed.fieldErrors[field] ?? '1–99'}
                    slotProps={{ htmlInput: { min: 1, max: 99, step: 1 } }}
                  />
                ))}
              </Box>

              {parsed.aggregateErrors.map((message) => (
                <Alert key={message} severity="error">
                  {message}
                </Alert>
              ))}

              <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
                  <Box>
                    <Typography variant="h5">
                      {calculateWorkIntervals(parsed.timing).toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Work intervals
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h5">
                      {formatClock(calculateScheduledSeconds(parsed.timing) * 1_000)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Scheduled duration
                    </Typography>
                  </Box>
                </Stack>
              </Paper>

              <Button
                variant="contained"
                size="large"
                disabled={hasErrors || saving}
                onClick={() => void save()}
              >
                {saving ? 'Saving…' : 'Save routine'}
              </Button>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Box>
  )
}
