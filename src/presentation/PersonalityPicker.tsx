import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Stack,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { isBuiltInContentPack } from '../domain/contentPacks/builtInContentPacks'
import {
  contentPackCategories,
  type ContentPack,
} from '../domain/contentPacks/types'

interface PersonalityPickerProps {
  readonly packs: readonly ContentPack[]
  readonly selectedId: string | null
  readonly storageNotice?: string
  readonly onBack: () => void
  readonly onSelect: (id: string | null) => Promise<void>
}

const totalSayings = (pack: ContentPack) =>
  contentPackCategories.reduce(
    (total, category) => total + (pack.sayings[category]?.length ?? 0),
    0,
  )

export function PersonalityPicker({
  packs,
  selectedId,
  storageNotice,
  onBack,
  onSelect,
}: PersonalityPickerProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const select = async (id: string | null) => {
    setBusy(true)
    setError(undefined)
    try {
      await onSelect(id)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'The Personality could not be selected.',
      )
    } finally {
      setBusy(false)
    }
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
              Choose Personality
            </Typography>
            <Typography color="text.secondary">
              Pick the motivational voice for this workout.
            </Typography>
          </Stack>

          {storageNotice && <Alert severity="warning">{storageNotice}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}

          <Stack spacing={2} aria-label="Personalities">
            <Button
              variant={selectedId === null ? 'contained' : 'outlined'}
              color={selectedId === null ? 'primary' : 'inherit'}
              disabled={busy}
              onClick={() => void select(null)}
              sx={{ justifyContent: 'flex-start', p: 2, textTransform: 'none' }}
            >
              <Stack sx={{ alignItems: 'flex-start' }}>
                <Typography variant="h6">None</Typography>
                <Typography variant="body2" color="text.secondary">
                  Essential timer cues only
                </Typography>
              </Stack>
            </Button>

            {packs.map((pack) => (
              <Button
                key={pack.id}
                variant={selectedId === pack.id ? 'contained' : 'outlined'}
                color={selectedId === pack.id ? 'primary' : 'inherit'}
                disabled={busy}
                onClick={() => void select(pack.id)}
                aria-label={`Select ${pack.name}`}
                sx={{ justifyContent: 'flex-start', p: 2, textTransform: 'none' }}
              >
                <Stack sx={{ alignItems: 'flex-start' }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Typography variant="h6">{pack.name}</Typography>
                    {isBuiltInContentPack(pack.id) && <Chip label="Built in" size="small" />}
                    {selectedId === pack.id && <Chip label="Selected" size="small" />}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {totalSayings(pack)} sayings
                  </Typography>
                </Stack>
              </Button>
            ))}
          </Stack>
        </Stack>
      </Container>
    </Box>
  )
}
