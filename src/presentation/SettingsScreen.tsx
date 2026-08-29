import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded'
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded'
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded'
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded'
import {
  Alert,
  Box,
  Button,
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
  Select,
  Stack,
  Switch,
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
  timerSoundsEnabled,
  spokenMotivationEnabled,
  allowOnlineVoices,
  voiceId,
  speechRate,
  participantCount,
  onBack,
  onParticipants,
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
              <FormControl fullWidth>
                <InputLabel id="voice-label">Voice</InputLabel>
                <Select
                  labelId="voice-label"
                  label="Voice"
                  value={
                    selectedVoiceUnavailable
                      ? SYSTEM_DEFAULT_VOICE_VALUE
                      : (voiceId ?? SYSTEM_DEFAULT_VOICE_VALUE)
                  }
                  disabled={busy}
                  onChange={(event) =>
                    void save({
                      voiceId:
                        event.target.value === SYSTEM_DEFAULT_VOICE_VALUE
                          ? null
                          : event.target.value,
                    })
                  }
                >
                  <MenuItem value={SYSTEM_DEFAULT_VOICE_VALUE}>System Default</MenuItem>
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
                      if (checked) {
                        setConfirmOnlineVoices(true)
                        return
                      }
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
        onClose={() => !busy && setConfirmOnlineVoices(false)}
      >
        <DialogTitle>Allow online voices?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            An individual saying and the participant name used to address it may be sent to the selected speech provider. Packs and rosters are never uploaded as collections.
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
            Allow online voices
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
