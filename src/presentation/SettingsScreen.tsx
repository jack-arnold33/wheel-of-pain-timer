import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded'
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded'
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded'
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded'
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Checkbox,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Slider,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import {
  parseLocalBackupFile,
  type LocalBackup,
} from '../domain/backup/localBackup'
import type { AppPreferences } from '../domain/preferences/appPreferences'
import { DEFAULT_VOICE_INSTRUCTIONS } from '../domain/contentPacks/validation'
import {
  primeSpokenMotivation,
  speakMotivation,
} from './spokenMotivation'
import { availableThemes, resolveTheme } from './themes/registry'
import {
  openAiCredentialRepository,
  type OpenAiCredentialStatus,
} from '../data/openAiCredentialRepository'
import {
  createOpenAiSpeech,
  OPENAI_SPEECH_VOICES,
  type OpenAiSpeechVoice,
} from '../services/openAiSpeech'
import { appAudioPlayer } from './timerAudio'

export type AudioPreferencePatch = Pick<
  AppPreferences,
  | 'timerSoundsEnabled'
  | 'transitionVolume'
  | 'spokenMotivationEnabled'
  | 'voiceVolume'
  | 'allowOnlineVoices'
  | 'voiceId'
  | 'speechRate'
>

export type SettingsPreferencePatch = AudioPreferencePatch &
  Pick<AppPreferences, 'themeId'>

interface SettingsScreenProps extends Omit<
  AudioPreferencePatch,
  'transitionVolume' | 'voiceVolume'
> {
  readonly transitionVolume?: number
  readonly voiceVolume?: number
  readonly themeId?: string
  readonly voiceInstructions?: string
  readonly participantCount: number
  readonly personalityCount?: number
  readonly onBack: () => void
  readonly onParticipants: () => void
  readonly onPersonalities?: () => void
  readonly onChange: (patch: Partial<SettingsPreferencePatch>) => Promise<void>
  readonly onExportBackup: () => Promise<LocalBackup>
  readonly onRestoreBackup: (backup: LocalBackup) => Promise<void>
}

const speechRates = [
  { label: 'Slow', value: 0.8 },
  { label: 'Normal', value: 1 },
  { label: 'Fast', value: 1.25 },
] as const

const SYSTEM_DEFAULT_VOICE_VALUE = 'system-default'

const speechSynthesis = () =>
  typeof window === 'undefined' ? undefined : window.speechSynthesis

export function SettingsScreen({
  themeId = 'wheel-of-pain',
  timerSoundsEnabled,
  transitionVolume = 0.5,
  spokenMotivationEnabled,
  voiceVolume = 1,
  allowOnlineVoices,
  voiceId,
  speechRate,
  voiceInstructions = DEFAULT_VOICE_INSTRUCTIONS,
  participantCount,
  personalityCount = 0,
  onBack,
  onParticipants,
  onPersonalities = () => undefined,
  onChange,
  onExportBackup,
  onRestoreBackup,
}: SettingsScreenProps) {
  const [voices, setVoices] = useState<readonly SpeechSynthesisVoice[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [previewNotice, setPreviewNotice] = useState<string>()
  const [backupBusy, setBackupBusy] = useState(false)
  const [backupNotice, setBackupNotice] = useState<string>()
  const [restorePreview, setRestorePreview] = useState<{
    readonly fileName: string
    readonly backup: LocalBackup
  }>()
  const [confirmOnlineVoices, setConfirmOnlineVoices] = useState(false)
  const [credential, setCredential] = useState<OpenAiCredentialStatus>({
    configured: false,
  })
  const [apiKey, setApiKey] = useState('')
  const [acknowledgeLocalKey, setAcknowledgeLocalKey] = useState(false)
  const [credentialBusy, setCredentialBusy] = useState(false)
  const [configureOnlineVoice, setConfigureOnlineVoice] = useState(false)

  useEffect(() => {
    let active = true
    void openAiCredentialRepository.status().then((status) => {
      if (active) setCredential(status)
    })
    return () => { active = false }
  }, [])

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
  const eligibleVoices = voices.filter((voice) => voice.localService === true)
  const selectedVoiceUnavailable =
    !allowOnlineVoices &&
    voiceId !== null &&
    (selectedVoice === undefined || selectedVoice.localService !== true)

  const save = async (patch: Partial<SettingsPreferencePatch>) => {
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

  const resolvedTheme = resolveTheme(themeId)
  const themeFallback = resolvedTheme.id !== themeId

  const preview = async () => {
    setPreviewNotice(undefined)
    if (allowOnlineVoices) {
      if (!credential.configured) {
        setPreviewNotice('Save an OpenAI API key on this device first.')
        return
      }
      setCredentialBusy(true)
      try {
        const selected = OPENAI_SPEECH_VOICES.some(({ id }) => id === voiceId)
          ? (voiceId as OpenAiSpeechVoice)
          : 'alloy'
        const blob = await createOpenAiSpeech({
          text: 'The Wheel of Pain awaits.',
          voice: selected,
          speed: speechRate,
          voiceInstructions,
        })
        appAudioPlayer.setSpeechVolume(voiceVolume)
        const result = await appAudioPlayer.playSpeechPreview(blob)
        if (result !== 'started') {
          setPreviewNotice('The generated preview could not be played.')
        }
      } catch {
        setPreviewNotice(
          'OpenAI speech could not be generated. Check the key and connection.',
        )
      } finally {
        setCredentialBusy(false)
      }
      return
    }
    let result: ReturnType<typeof speakMotivation>
    try {
      primeSpokenMotivation()
      result = speakMotivation('The Wheel of Pain awaits.', {
        allowOnlineVoices: false,
        voiceId,
        rate: speechRate,
        volume: voiceVolume,
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

  const saveApiKey = async () => {
    setCredentialBusy(true)
    setError(undefined)
    setPreviewNotice(undefined)
    try {
      const status = await openAiCredentialRepository.save(apiKey)
      setCredential(status)
      setApiKey('')
      setAcknowledgeLocalKey(false)
      setPreviewNotice('OpenAI API key saved only on this device.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The API key could not be saved.')
    } finally {
      setCredentialBusy(false)
    }
  }

  const removeApiKey = async () => {
    setCredentialBusy(true)
    setError(undefined)
    try {
      appAudioPlayer.cancelSpeech()
      await openAiCredentialRepository.remove()
      setCredential({ configured: false })
      setApiKey('')
      setConfigureOnlineVoice(false)
      if (allowOnlineVoices) await save({ allowOnlineVoices: false, voiceId: null })
      setPreviewNotice('OpenAI API key removed from this device.')
    } catch {
      setError('The API key could not be removed. Try again.')
    } finally {
      setCredentialBusy(false)
    }
  }

  const exportBackup = async () => {
    setBackupBusy(true)
    setError(undefined)
    setBackupNotice(undefined)
    try {
      const backup = await onExportBackup()
      const blob = new Blob([`${JSON.stringify(backup, null, 2)}\n`], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `wheel-of-pain-backup-${new Date().toISOString().slice(0, 10)}.json`
      anchor.click()
      URL.revokeObjectURL(url)
      setBackupNotice('Backup downloaded. Keep the file somewhere safe.')
    } catch {
      setError('The local backup could not be exported. Try again.')
    } finally {
      setBackupBusy(false)
    }
  }

  const inspectBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file === undefined) return
    setBackupBusy(true)
    setError(undefined)
    setBackupNotice(undefined)
    try {
      const backup = await parseLocalBackupFile(file)
      setRestorePreview({ fileName: file.name, backup })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The backup file is invalid.')
    } finally {
      setBackupBusy(false)
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
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}
          {previewNotice && <Alert severity="info">{previewNotice}</Alert>}
          {backupNotice && <Alert severity="success">{backupNotice}</Alert>}
          {selectedVoiceUnavailable && (
            <Alert severity="warning">
              The selected voice is unavailable. Spoken motivation will use an eligible system default.
            </Alert>
          )}

          {themeFallback && (
            <Alert severity="warning">
              The saved appearance is unavailable. {resolvedTheme.name} is being used instead.
            </Alert>
          )}

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Stack spacing={0.5}>
                <Typography id="appearance-heading" variant="h5">
                  Appearance
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Optional theme fonts need a network connection. The timer remains usable with a fallback font offline.
                </Typography>
              </Stack>
              <Box
                role="radiogroup"
                aria-labelledby="appearance-heading"
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: 1.5,
                }}
              >
                {availableThemes.map((definition) => {
                  const selected = definition.id === resolvedTheme.id
                  return (
                    <ButtonBase
                      key={definition.id}
                      role="radio"
                      aria-checked={selected}
                      aria-label={`Use ${definition.name} theme`}
                      disabled={busy}
                      onClick={() => void save({ themeId: definition.id })}
                      sx={{
                        display: 'block',
                        border: '2px solid',
                        borderColor: selected ? 'primary.main' : 'divider',
                        borderRadius: 1,
                        overflow: 'hidden',
                        textAlign: 'left',
                      }}
                    >
                      <Box
                        sx={{
                          minHeight: 72,
                          p: 1.5,
                          color: definition.preview.text,
                          bgcolor: definition.preview.background,
                          borderBottom: '12px solid',
                          borderBottomColor: definition.preview.primary,
                        }}
                      >
                        <Typography
                          component="span"
                          sx={{
                            display: 'block',
                            fontFamily: definition.theme.typography.h5.fontFamily,
                            fontSize: '1.25rem',
                            fontWeight: 800,
                          }}
                        >
                          {definition.name}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          p: 1.5,
                          bgcolor: definition.preview.paper,
                          color: definition.preview.text,
                          minHeight: 94,
                        }}
                      >
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{ alignItems: 'flex-start' }}
                        >
                          <Typography variant="body2" sx={{ flex: 1, opacity: 0.8 }}>
                            {definition.description}
                          </Typography>
                          {selected && <CheckRoundedIcon color="primary" aria-hidden />}
                        </Stack>
                      </Box>
                    </ButtonBase>
                  )
                })}
              </Box>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h5">Workout setup</Typography>
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
              <Button
                variant="outlined"
                startIcon={<AutoAwesomeRoundedIcon />}
                onClick={onPersonalities}
                sx={{ justifyContent: 'space-between' }}
              >
                Personalities
                <Typography component="span" color="text.secondary">
                  {personalityCount} available
                </Typography>
              </Button>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={2}>
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
              <Stack spacing={0.5}>
                <Typography>Transition bell volume</Typography>
                <Slider
                  aria-label="Transition bell volume"
                  value={Math.round(transitionVolume * 100)}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${value}%`}
                  disabled={busy || !timerSoundsEnabled}
                  onChangeCommitted={(_, value) =>
                    void save({ transitionVolume: (value as number) / 100 })
                  }
                />
              </Stack>
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
              <Stack spacing={0.5}>
                <Typography>Motivational voice volume</Typography>
                <Slider
                  aria-label="Motivational voice volume"
                  value={Math.round(voiceVolume * 100)}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${value}%`}
                  disabled={busy || !spokenMotivationEnabled}
                  onChangeCommitted={(_, value) =>
                    void save({ voiceVolume: (value as number) / 100 })
                  }
                />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {allowOnlineVoices
                  ? 'TV-compatible online voice uses generated media and requires internet access.'
                  : 'Device voice uses browser speech and may not follow the television audio route.'}
              </Typography>
              <FormControl fullWidth>
                <InputLabel id="voice-label">Voice</InputLabel>
                <Select
                  labelId="voice-label"
                  label="Voice"
                  value={
                    allowOnlineVoices
                      ? (OPENAI_SPEECH_VOICES.some(({ id }) => id === voiceId)
                          ? voiceId
                          : 'alloy')
                      : (selectedVoiceUnavailable
                          ? SYSTEM_DEFAULT_VOICE_VALUE
                          : (voiceId ?? SYSTEM_DEFAULT_VOICE_VALUE))
                  }
                  disabled={busy || credentialBusy}
                  onChange={(event) =>
                    void save({
                      voiceId:
                        event.target.value === SYSTEM_DEFAULT_VOICE_VALUE
                          ? null
                          : event.target.value,
                    })
                  }
                >
                  {allowOnlineVoices ? (
                    OPENAI_SPEECH_VOICES.map((voice) => (
                      <MenuItem key={voice.id} value={voice.id}>{voice.label}</MenuItem>
                    ))
                  ) : (
                    [
                      <MenuItem key={SYSTEM_DEFAULT_VOICE_VALUE} value={SYSTEM_DEFAULT_VOICE_VALUE}>
                        System Default
                      </MenuItem>,
                      ...eligibleVoices.map((voice) => (
                        <MenuItem key={voice.voiceURI} value={voice.voiceURI}>
                          {voice.name} ({voice.lang}) · On-device
                        </MenuItem>
                      )),
                    ]
                  )}
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
                onClick={() => void preview()}
                disabled={!spokenMotivationEnabled || credentialBusy}
              >
                {allowOnlineVoices ? 'Test TV-compatible voice' : 'Preview device voice'}
              </Button>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h5">Voice output</Typography>
              <FormControl>
                <RadioGroup
                  aria-label="Motivational voice output"
                  value={allowOnlineVoices || configureOnlineVoice ? 'openai' : 'device'}
                  onChange={(_, value) => {
                    if (value === 'openai') {
                      setConfigureOnlineVoice(true)
                      return
                    }
                    setConfigureOnlineVoice(false)
                    appAudioPlayer.cancelSpeech()
                    if (allowOnlineVoices) {
                      void save({
                        allowOnlineVoices: false,
                        voiceId: null,
                      })
                    }
                  }}
                >
                  <FormControlLabel
                    value="device"
                    disabled={busy || credentialBusy}
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography>Device voice</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Free and available offline, but it may play on this device
                          instead of the TV.
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: 'flex-start', '& .MuiRadio-root': { mt: -0.5 } }}
                  />
                  <FormControlLabel
                    value="openai"
                    disabled={busy || credentialBusy}
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography>TV voice through OpenAI</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Uses internet and API credit. Generated audio is routed through
                          the TV-compatible player.
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: 'flex-start', '& .MuiRadio-root': { mt: -0.5 } }}
                  />
                </RadioGroup>
              </FormControl>
              {(allowOnlineVoices || configureOnlineVoice) && (
                <Stack spacing={2}>
                  {!credential.configured && (
                    <Alert severity="info">
                      Enter and save an OpenAI API key below to continue.
                    </Alert>
                  )}
                  <Alert severity="warning">
                    Use a dedicated OpenAI project with a small hard spending limit and alert.
                    OpenAI recommends keeping API keys on a server; this personal-use app stores
                    the key in this device&apos;s IndexedDB instead.
                  </Alert>
                  <Typography variant="body2">
                    {credential.configured
                      ? `Key configured on this device · ends in ${credential.lastFour}`
                      : 'No OpenAI API key is configured on this device.'}
                  </Typography>
                  <TextField
                    label={credential.configured ? 'Replacement OpenAI API key' : 'OpenAI API key'}
                    type="password"
                    autoComplete="off"
                    value={apiKey}
                    disabled={credentialBusy}
                    onChange={(event) => setApiKey(event.target.value)}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={acknowledgeLocalKey}
                        disabled={credentialBusy}
                        onChange={(_, checked) => setAcknowledgeLocalKey(checked)}
                      />
                    }
                    label="I understand this key stays on this device and can be read by code running as this app."
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <Button
                      variant="contained"
                      disabled={credentialBusy || !acknowledgeLocalKey || apiKey.trim().length === 0}
                      onClick={() => void saveApiKey()}
                    >
                      {credential.configured ? 'Replace key' : 'Save on this device'}
                    </Button>
                    {credential.configured && !allowOnlineVoices && (
                      <Button
                        variant="contained"
                        disabled={credentialBusy}
                        onClick={() => setConfirmOnlineVoices(true)}
                      >
                        Enable TV voice
                      </Button>
                    )}
                    {credential.configured && (
                      <Button
                        color="error"
                        variant="outlined"
                        disabled={credentialBusy}
                        onClick={() => void removeApiKey()}
                      >
                        Remove key
                      </Button>
                    )}
                  </Stack>
                </Stack>
              )}
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h5">Local backup</Typography>
              <Typography variant="body2" color="text.secondary">
                Clearing browser data or removing the app may erase saved routines, Personalities, participants, and settings. Export a backup before destructive changes.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<FileDownloadRoundedIcon />}
                  disabled={backupBusy}
                  onClick={() => void exportBackup()}
                  sx={{ flex: 1 }}
                >
                  Export backup
                </Button>
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<UploadFileRoundedIcon />}
                  disabled={backupBusy}
                  sx={{ flex: 1 }}
                >
                  Restore backup
                  <input
                    hidden
                    type="file"
                    accept=".json,.wheelbackup.json,application/json"
                    onChange={(event) => void inspectBackup(event)}
                  />
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Stack>
      </Container>

      <Dialog
        open={confirmOnlineVoices}
        onClose={() => {
          if (!busy) setConfirmOnlineVoices(false)
        }}
      >
        <DialogTitle>Enable TV-compatible online voice?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            One selected saying and the participant name used to address it, together with the
            selected Personality&apos;s voice instructions, will be sent to OpenAI. Personalities,
            rosters, routines, and workout history are never uploaded as collections.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setConfirmOnlineVoices(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={busy}
            onClick={() => {
              void save({ allowOnlineVoices: true }).then(() =>
                setConfirmOnlineVoices(false),
              )
            }}
          >
            Enable online voice
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={restorePreview !== undefined}
        onClose={() => !backupBusy && setRestorePreview(undefined)}
        fullWidth
      >
        <DialogTitle>Restore local backup?</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <DialogContentText>
              {restorePreview?.fileName} will completely replace the user data currently saved on this device. The protected Wheel of Pain routine and built-in Personality remain available.
            </DialogContentText>
            {restorePreview && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={1}>
                  <Typography>{restorePreview.backup.routines.length} user routines</Typography>
                  <Typography>{restorePreview.backup.contentPacks.length} saved Personalities</Typography>
                  <Typography>{restorePreview.backup.participants.length} participants</Typography>
                  <Typography>All device preferences and attendance</Typography>
                </Stack>
              </Paper>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={backupBusy} onClick={() => setRestorePreview(undefined)}>
            Cancel
          </Button>
          <Button
            color="warning"
            variant="contained"
            disabled={backupBusy}
            onClick={() => {
              if (restorePreview === undefined) return
              setBackupBusy(true)
              setError(undefined)
              void onRestoreBackup(restorePreview.backup)
                .catch(() => {
                  setError('The backup could not be restored. Current data was not changed.')
                  setBackupBusy(false)
                  setRestorePreview(undefined)
                })
            }}
          >
            {backupBusy ? 'Restoring…' : 'Replace and restore'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
