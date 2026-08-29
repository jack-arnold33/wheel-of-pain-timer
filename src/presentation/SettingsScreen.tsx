import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded'
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded'
import {
  Alert,
  Box,
  Button,
  Container,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import type { AppPreferences } from '../domain/preferences/appPreferences'
import {
  primeSpokenMotivation,
  speakMotivation,
} from './spokenMotivation'

export type AudioPreferencePatch = Pick<
  AppPreferences,
  | 'timerSoundsEnabled'
  | 'spokenMotivationEnabled'
  | 'allowOnlineVoices'
  | 'voiceId'
  | 'speechRate'
>

interface SettingsScreenProps extends AudioPreferencePatch {
  readonly participantCount: number
  readonly onBack: () => void
  readonly onParticipants: () => void
  readonly onChange: (patch: Partial<AudioPreferencePatch>) => Promise<void>
}

const speechRates = [
  { label: 'Slow', value: 0.8 },
  { label: 'Normal', value: 1 },
  { label: 'Fast', value: 1.25 },
] as const

const speechSynthesis = () =>
  typeof window === 'undefined' ? undefined : window.speechSynthesis

export function SettingsScreen({
  timerSoundsEnabled,
  spokenMotivationEnabled,
  allowOnlineVoices,
  voiceId,
  speechRate,
  participantCount,
  onBack,
  onParticipants,
  onChange,
}: SettingsScreenProps) {
  const [voices, setVoices] = useState<readonly SpeechSynthesisVoice[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [previewNotice, setPreviewNotice] = useState<string>()

  useEffect(() => {
    const synthesis = speechSynthesis()
    if (synthesis === undefined) return
    const refresh = () => setVoices(synthesis.getVoices())
    refresh()
    synthesis.addEventListener?.('voiceschanged', refresh)
    return () => synthesis.removeEventListener?.('voiceschanged', refresh)
  }, [])

  const selectedVoice = useMemo(
    () => voices.find((voice) => voice.voiceURI === voiceId),
    [voiceId, voices],
  )
  const eligibleVoices = voices.filter(
    (voice) => allowOnlineVoices || voice.localService === true,
  )
  const selectedVoiceUnavailable =
    voiceId !== null &&
    (selectedVoice === undefined ||
      (!allowOnlineVoices && selectedVoice.localService !== true))

  const save = async (patch: Partial<AudioPreferencePatch>) => {
    setBusy(true)
    setError(undefined)
    setPreviewNotice(undefined)
    try {
      await onChange(patch)
    } catch {
      setError('Settings could not be saved on this device. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const preview = () => {
    setPreviewNotice(undefined)
    let result: ReturnType<typeof speakMotivation>
    try {
      primeSpokenMotivation()
      result = speakMotivation('The Wheel of Pain awaits.', {
        allowOnlineVoices,
        voiceId,
        rate: speechRate,
      })
    } catch {
      setPreviewNotice('The voice preview could not be played.')
      return
    }
    if (result === 'unsupported') {
      setPreviewNotice('Speech synthesis is not supported by this browser.')
    } else if (result === 'no-eligible-voice') {
      setPreviewNotice('No eligible voice is available under the current online-voice setting.')
    } else if (result === 'spoken-with-fallback') {
      setPreviewNotice('The selected voice is unavailable. Previewing the eligible system default.')
    }
  }

  return (
    <Box component="main" sx={{ minHeight: '100dvh', py: { xs: 3, sm: 6 } }}>
      <Container maxWidth="sm">
        <Stack spacing={3}>
          <Button
            startIcon={<ArrowBackRoundedIcon />}
            onClick={onBack}
            sx={{ alignSelf: 'flex-start' }}
          >
            Back
          </Button>

          <Stack spacing={1}>
            <Typography variant="h1" sx={{ fontSize: { xs: '2.5rem', sm: '3.5rem' } }}>
              Settings
            </Typography>
            <Typography color="text.secondary">
              Audio and voice choices stay on this device.
            </Typography>
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}
          {previewNotice && <Alert severity="info">{previewNotice}</Alert>}
          {selectedVoiceUnavailable && (
            <Alert severity="warning">
              The selected voice is unavailable. Spoken motivation will use an eligible system default.
            </Alert>
          )}

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Typography variant="h5">Audio</Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={timerSoundsEnabled}
                    disabled={busy}
                    onChange={(_, checked) => void save({ timerSoundsEnabled: checked })}
                  />
                }
                label="Timer sounds"
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: '-1rem !important' }}>
                Countdown and phase-transition beeps.
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={spokenMotivationEnabled}
                    disabled={busy}
                    onChange={(_, checked) => void save({ spokenMotivationEnabled: checked })}
                  />
                }
                label="Spoken motivation"
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: '-1rem !important' }}>
                Sayings from the selected Personality. Timer beeps remain independent.
              </Typography>

              <FormControl fullWidth>
                <InputLabel id="voice-label">Voice</InputLabel>
                <Select
                  labelId="voice-label"
                  label="Voice"
                  value={selectedVoiceUnavailable ? '' : (voiceId ?? '')}
                  disabled={busy}
                  onChange={(event) =>
                    void save({ voiceId: event.target.value === '' ? null : event.target.value })
                  }
                >
                  <MenuItem value="">System Default</MenuItem>
                  {voices.map((voice) => {
                    const onDevice = voice.localService === true
                    return (
                      <MenuItem
                        key={voice.voiceURI}
                        value={voice.voiceURI}
                        disabled={!allowOnlineVoices && !onDevice}
                      >
                        {voice.name} ({voice.lang}) · {onDevice ? 'On-device' : 'Online or unknown'}
                      </MenuItem>
                    )
                  })}
                </Select>
              </FormControl>

              {speechSynthesis() !== undefined && eligibleVoices.length === 0 && (
                <Alert severity="warning">
                  No eligible on-device voice is currently exposed by this browser.
                </Alert>
              )}

              <Stack spacing={1}>
                <Typography>Speech speed</Typography>
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  value={speechRate}
                  aria-label="Speech speed"
                  onChange={(_, value: number | null) => {
                    if (value !== null) void save({ speechRate: value })
                  }}
                >
                  {speechRates.map((rate) => (
                    <ToggleButton key={rate.label} value={rate.value} disabled={busy}>
                      {rate.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Stack>

              <Button
                variant="outlined"
                startIcon={<VolumeUpRoundedIcon />}
                onClick={preview}
                disabled={!spokenMotivationEnabled}
              >
                Preview voice
              </Button>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h5">Voice privacy</Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={allowOnlineVoices}
                    disabled={busy}
                    onChange={(_, checked) => {
                      const clearOnlineSelection =
                        !checked && selectedVoice?.localService !== true
                      void save({
                        allowOnlineVoices: checked,
                        ...(clearOnlineSelection ? { voiceId: null } : {}),
                      })
                    }}
                  />
                }
                label="Allow online voices"
              />
              <Typography variant="body2" color="text.secondary">
                When enabled, an individual saying and the participant name used to address it may be sent to the selected speech provider. Packs and rosters are never uploaded as collections.
              </Typography>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h5">People</Typography>
              <Button
                variant="outlined"
                startIcon={<GroupsRoundedIcon />}
                onClick={onParticipants}
                sx={{ justifyContent: 'space-between' }}
              >
                Participants
                <Typography component="span" color="text.secondary">
                  {participantCount} saved
                </Typography>
              </Button>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Box>
  )
}
