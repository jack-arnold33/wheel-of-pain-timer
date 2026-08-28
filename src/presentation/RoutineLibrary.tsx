import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Stack,
  Typography,
} from '@mui/material'
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded'
import type { Routine } from '../domain/routines/types'
import {
  calculateScheduledSeconds,
  calculateWorkIntervals,
} from '../domain/timer/validation'
import { formatClock } from './timerPresentation'

interface RoutineLibraryProps {
  readonly routines: readonly Routine[]
  readonly storageNotice?: string
  readonly onSelect: (routine: Routine) => void
  readonly onCreate: () => void
  readonly onSettings: () => void
}

export function RoutineLibrary({
  routines,
  storageNotice,
  onSelect,
  onCreate,
  onSettings,
}: RoutineLibraryProps) {
  return (
    <Box component="main" sx={{ minHeight: '100dvh', py: { xs: 4, sm: 8 } }}>
      <Container maxWidth="sm">
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography color="primary.main" sx={{ fontWeight: 800 }}>
              WHEEL OF PAIN
            </Typography>
            <Typography variant="h1" sx={{ fontSize: { xs: '2.75rem', sm: '4rem' } }}>
              Routines
            </Typography>
            <Typography color="text.secondary">
              Choose a routine to review before starting the timer.
            </Typography>
          </Stack>

          {storageNotice && <Alert severity="warning">{storageNotice}</Alert>}

          <Stack direction="row" spacing={1}>
            <Button variant="contained" size="large" onClick={onCreate} sx={{ flex: 1 }}>
              Create routine
            </Button>
            <Button
              variant="outlined"
              size="large"
              aria-label="Settings"
              onClick={onSettings}
            >
              <SettingsRoundedIcon />
            </Button>
          </Stack>

          <Stack spacing={2} aria-label="Available routines">
            {routines.map((routine) => {
              const workIntervals = calculateWorkIntervals(routine.timing)
              const scheduledMs = calculateScheduledSeconds(routine.timing) * 1_000
              return (
                <Button
                  key={routine.id}
                  variant="outlined"
                  color="inherit"
                  aria-label={`Review ${routine.name}`}
                  onClick={() => onSelect(routine)}
                  sx={{
                    p: 2.5,
                    justifyContent: 'stretch',
                    textAlign: 'left',
                    textTransform: 'none',
                  }}
                >
                  <Stack spacing={1} sx={{ width: '100%' }}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
                      <Typography variant="h5" color="text.primary">
                        {routine.name}
                      </Typography>
                      {routine.ownership === 'protected' && (
                        <Chip label="Protected" color="primary" size="small" />
                      )}
                    </Stack>
                    <Typography color="text.secondary">
                      {workIntervals} work intervals · {formatClock(scheduledMs)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {routine.timing.cycles} cycles · {routine.timing.roundsPerCycle} rounds ·{' '}
                      {routine.timing.exercisesPerRound} exercises
                    </Typography>
                  </Stack>
                </Button>
              )
            })}
          </Stack>
        </Stack>
      </Container>
    </Box>
  )
}
