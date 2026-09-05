import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  Divider,
  FormControlLabel,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  authoringDraftFromPack,
  buildPersonalityPrompt,
  clearPersonalityAuthoringDraft,
  contentPackFromAuthoringDraft,
  loadPersonalityAuthoringDraft,
  parsePastedPersonality,
  personalityAuthoringCategories,
  savePersonalityAuthoringDraft,
  type PersonalityAuthoringCategory,
  type PersonalityAuthoringDraft,
} from '../domain/contentPacks/personalityAuthoring'
import type { ContentPackDraft } from '../domain/contentPacks/types'
import type { CrewProfile, Participant } from '../domain/participants/types'
import {
  generateOpenAiPersonality,
  OpenAiPersonalityError,
} from '../services/openAiPersonality'

interface PersonalityCreatorProps {
  readonly participants: readonly Participant[]
  readonly activeParticipantIds: readonly string[]
  readonly crewProfile: CrewProfile
  readonly openAiFeaturesEnabled: boolean
  readonly onCancel: () => void
  readonly onSave: (draft: ContentPackDraft) => Promise<boolean>
}

const categoryPresentation: Record<
  PersonalityAuthoringCategory,
  { readonly label: string; readonly description: string }
> = {
  work: {
    label: 'During work',
    description: 'Spoken at the beginning of each work round.',
  },
  cycleRest: {
    label: 'During cycle rest',
    description: 'Spoken at the beginning of each longer cycle rest.',
  },
  finished: {
    label: 'Workout complete',
    description: 'Spoken once after a normally completed workout.',
  },
}

const lineCount = (value: string) =>
  value
    .split(/\r?\n/u)
    .filter((line) => line.trim().replace(/^•\s*/u, '').length > 0).length

const generationError = (error: unknown) => {
  if (!(error instanceof OpenAiPersonalityError)) {
    return error instanceof Error ? error.message : 'The sayings could not be generated.'
  }
  if (error.code === 'not-configured') return 'Save an OpenAI API key in Settings first.'
  if (error.code === 'authentication') return 'The OpenAI API key was rejected.'
  if (error.code === 'rate-limited') return 'OpenAI is rate limited. Try again shortly.'
  if (error.code === 'timeout') return 'Generation took too long. Try again.'
  if (error.code === 'invalid-response') return 'OpenAI returned sayings the app could not validate. Try again.'
  return 'OpenAI generation is unavailable right now. You can still use the copy-and-paste option.'
}

export function PersonalityCreator({
  participants,
  activeParticipantIds,
  crewProfile,
  openAiFeaturesEnabled,
  onCancel,
  onSave,
}: PersonalityCreatorProps) {
  const [draft, setDraft] = useState(() => {
    const stored = loadPersonalityAuthoringDraft()
    return stored.selectedParticipantIds.length === 0
      ? { ...stored, selectedParticipantIds: [...activeParticipantIds] }
      : stored
  })
  const [error, setError] = useState<string>()
  const [notice, setNotice] = useState<string>()
  const [showPrompt, setShowPrompt] = useState(false)
  const [busy, setBusy] = useState(false)
  const errorRef = useRef<HTMLDivElement>(null)
  const prompt = useMemo(
    () => buildPersonalityPrompt(draft, participants, crewProfile),
    [crewProfile, draft, participants],
  )

  useEffect(() => savePersonalityAuthoringDraft(draft), [draft])
  useEffect(() => {
    if (error !== undefined) {
      errorRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    }
  }, [error])

  const update = <Key extends keyof PersonalityAuthoringDraft>(
    key: Key,
    value: PersonalityAuthoringDraft[Key],
  ) => setDraft((current) => ({ ...current, [key]: value }))

  const copyPrompt = async () => {
    setError(undefined)
    setNotice(undefined)
    setShowPrompt(true)
    try {
      if (navigator.clipboard?.writeText === undefined) throw new Error()
      await navigator.clipboard.writeText(prompt)
      setNotice('Prompt copied. Your draft is saved, so you can switch to ChatGPT safely.')
    } catch {
      setNotice('Copy the prompt below, then return here with ChatGPT’s response.')
    }
  }

  const reviewResponse = () => {
    setError(undefined)
    try {
      const pack = parsePastedPersonality(draft.response, draft.name)
      setDraft((current) => authoringDraftFromPack(current, pack))
      setNotice(undefined)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The response could not be read.')
    }
  }

  const generate = async () => {
    setError(undefined)
    setNotice(undefined)
    setBusy(true)
    try {
      const pack = await generateOpenAiPersonality(draft, participants, crewProfile)
      setDraft((current) => authoringDraftFromPack(current, pack))
    } catch (caught) {
      setError(generationError(caught))
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    setError(undefined)
    setBusy(true)
    try {
      const pack = contentPackFromAuthoringDraft(draft)
      if (await onSave(pack)) {
        clearPersonalityAuthoringDraft()
        onCancel()
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The Personality could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box component="main" sx={{ minHeight: '100dvh', py: { xs: 2, sm: 6 } }}>
      <Container maxWidth="sm">
        <Stack spacing={3}>
          <Button
            startIcon={<ArrowBackRoundedIcon />}
            onClick={draft.step === 'review' ? () => update('step', 'ideas') : onCancel}
            sx={{ alignSelf: 'flex-start' }}
          >
            {draft.step === 'review' ? 'Ideas & AI' : 'Personality library'}
          </Button>

          <Stack spacing={1}>
            <Typography variant="h1" sx={{ fontSize: { xs: '2.15rem', sm: '3rem' } }}>
              {draft.step === 'review' ? 'Review Personality' : 'Create Personality'}
            </Typography>
            <Typography color="text.secondary">
              {draft.step === 'review'
                ? 'Review each saying and edit anything before saving.'
                : 'Shape an idea here, then use ChatGPT to write the sayings.'}
            </Typography>
          </Stack>

          {error && <Alert ref={errorRef} severity="error">{error}</Alert>}
          {notice && <Alert severity="success">{notice}</Alert>}

          {draft.step === 'ideas' ? (
            <>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={2}>
                  <TextField
                    required
                    fullWidth
                    label="Personality name"
                    value={draft.name}
                    onChange={(event) => update('name', event.target.value)}
                    slotProps={{ htmlInput: { maxLength: 80 } }}
                  />
                  <Stack spacing={1}>
                    <Typography variant="h6">Saying style</Typography>
                    <RadioGroup
                      value={draft.mode}
                      onChange={(_, value) => update('mode', value as 'classic' | 'crew')}
                    >
                      <FormControlLabel
                        value="classic"
                        control={<Radio />}
                        label="Classic call-outs — the app adds a rotating participant name"
                      />
                      <FormControlLabel
                        value="crew"
                        control={<Radio />}
                        label="Crew-personalized — names and profile facts are written into the sayings"
                      />
                    </RadioGroup>
                  </Stack>
                  {draft.mode === 'crew' && (
                    <Stack spacing={1}>
                      <Typography variant="h6">People to include</Typography>
                      {participants.length === 0 ? (
                        <Alert severity="info">Add participant profiles before generating crew sayings.</Alert>
                      ) : participants.map((participant) => (
                        <FormControlLabel
                          key={participant.id}
                          control={
                            <Checkbox
                              checked={draft.selectedParticipantIds.includes(participant.id)}
                              onChange={(_, checked) =>
                                update(
                                  'selectedParticipantIds',
                                  checked
                                    ? [...draft.selectedParticipantIds, participant.id]
                                    : draft.selectedParticipantIds.filter((id) => id !== participant.id),
                                )
                              }
                            />
                          }
                          label={participant.name}
                        />
                      ))}
                      {crewProfile.name && (
                        <Typography variant="body2" color="text.secondary">
                          Using the saved {crewProfile.name} crew profile.
                        </Typography>
                      )}
                    </Stack>
                  )}
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    label="Tone"
                    placeholder="Dry, theatrical, encouraging…"
                    value={draft.tone}
                    onChange={(event) => update('tone', event.target.value)}
                  />
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    label="Themes and inside jokes"
                    placeholder="Group traditions, recurring jokes, favorite phrases…"
                    value={draft.themes}
                    onChange={(event) => update('themes', event.target.value)}
                  />
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    label="Things to avoid"
                    placeholder="Topics, language, or kinds of jokes to leave out…"
                    value={draft.avoid}
                    onChange={(event) => update('avoid', event.target.value)}
                  />
                </Stack>
              </Paper>

              <Stack spacing={1.5}>
                <Button
                  variant="contained"
                  startIcon={<AutoAwesomeRoundedIcon />}
                  disabled={
                    busy ||
                    !openAiFeaturesEnabled ||
                    draft.name.trim().length === 0 ||
                    (draft.mode === 'crew' && draft.selectedParticipantIds.length === 0)
                  }
                  onClick={() => void generate()}
                >
                  {busy ? 'Generating…' : 'Generate with OpenAI'}
                </Button>
                {!openAiFeaturesEnabled && (
                  <Typography variant="body2" color="text.secondary">
                    Enable OpenAI features in Settings to generate here.
                  </Typography>
                )}
                <Button
                  variant="outlined"
                  startIcon={<ContentCopyRoundedIcon />}
                  disabled={draft.name.trim().length === 0}
                  onClick={() => void copyPrompt()}
                >
                  Copy prompt for another AI
                </Button>
                <Typography variant="body2" color="text.secondary">
                  The copy-and-paste workflow remains available as a fallback.
                </Typography>
              </Stack>

              {showPrompt && (
                <TextField
                  fullWidth
                  multiline
                  minRows={7}
                  label="AI prompt"
                  value={prompt}
                  slotProps={{ input: { readOnly: true } }}
                />
              )}

              <Divider>then</Divider>

              <Stack spacing={1}>
                <Button
                  color="error"
                  startIcon={<DeleteOutlineRoundedIcon />}
                  disabled={draft.response.length === 0}
                  onClick={() => {
                    update('response', '')
                    setError(undefined)
                    setNotice(undefined)
                  }}
                  sx={{ alignSelf: 'flex-end' }}
                >
                  Clear pasted response
                </Button>
                <TextField
                  fullWidth
                  multiline
                  minRows={9}
                  label="Paste ChatGPT response"
                  placeholder='Paste the generated JSON here. Plain text with one work saying per line also works.'
                  value={draft.response}
                  onChange={(event) => update('response', event.target.value)}
                />
              </Stack>
              <Button
                variant="contained"
                disabled={draft.response.trim().length === 0}
                onClick={reviewResponse}
              >
                Review sayings
              </Button>
            </>
          ) : (
            <>
              <TextField
                required
                fullWidth
                label="Personality name"
                value={draft.name}
                onChange={(event) => update('name', event.target.value)}
                slotProps={{ htmlInput: { maxLength: 80 } }}
              />
              <TextField
                required
                fullWidth
                multiline
                minRows={3}
                label="AI voice instructions"
                value={draft.voiceInstructions}
                onChange={(event) => update('voiceInstructions', event.target.value)}
                helperText="Describe how this Personality should sound. The app separately requires the voice to read each saying exactly."
                slotProps={{ htmlInput: { maxLength: 500 } }}
              />
              {personalityAuthoringCategories.map((category) => (
                <Paper key={category} variant="outlined" sx={{ p: 2 }}>
                  <Stack spacing={1.5}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
                      <Typography variant="h6">{categoryPresentation[category].label}</Typography>
                      <Typography color="text.secondary">
                        {lineCount(draft.sayings[category])}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {categoryPresentation[category].description}
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      minRows={6}
                      maxRows={12}
                      label={`${categoryPresentation[category].label} sayings`}
                      value={draft.sayings[category]}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          sayings: { ...current.sayings, [category]: event.target.value },
                        }))
                      }
                      helperText="Each bullet is one saying. Bullets are not saved or spoken."
                    />
                  </Stack>
                </Paper>
              ))}
              <Paper
                elevation={4}
                sx={{ position: { xs: 'sticky', sm: 'static' }, bottom: 12, p: 1.5, zIndex: 1 }}
              >
                <Button
                  fullWidth
                  variant="contained"
                  disabled={busy || draft.voiceInstructions.trim().length === 0}
                  onClick={() => void save()}
                >
                  Save Personality
                </Button>
              </Paper>
            </>
          )}
        </Stack>
      </Container>
    </Box>
  )
}
