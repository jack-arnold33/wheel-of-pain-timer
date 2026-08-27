import { Box, Chip, Container, Paper, Stack, Typography } from '@mui/material'
import { buildWorkoutSequence } from './domain/timer/sequence'
import { standardRoutineTiming } from './domain/timer/standardRoutine'
import { PwaUpdatePrompt } from './presentation/PwaUpdatePrompt'

const standardSequence = buildWorkoutSequence(standardRoutineTiming)
const workIntervals = standardSequence.filter(({ kind }) => kind === 'work').length

export function App() {
  return (
    <Box component="main" sx={{ minHeight: '100dvh', py: { xs: 4, sm: 8 } }}>
      <Container maxWidth="sm">
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Chip label="MVP foundation" color="primary" sx={{ alignSelf: 'flex-start' }} />
            <Typography variant="h1" sx={{ fontSize: { xs: '2.5rem', sm: '3.5rem' } }}>
              Wheel of Pain
            </Typography>
            <Typography color="text.secondary">
              The production PWA shell and deterministic timer engine are ready.
            </Typography>
          </Stack>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={1}>
              <Typography variant="h6">Protected standard routine</Typography>
              <Typography>{workIntervals} work intervals</Typography>
              <Typography color="text.secondary">
                4 cycles · 4 rounds · 3 exercises
              </Typography>
            </Stack>
          </Paper>
        </Stack>
      </Container>
      <PwaUpdatePrompt activationAllowed />
    </Box>
  )
}
