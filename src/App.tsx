import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { protectedStandardRoutine } from './domain/routines/protectedRoutine'
import type { Routine, RoutineInput, UserRoutine } from './domain/routines/types'
import type {
  ContentPack,
  ContentPackDraft,
} from './domain/contentPacks/types'
import type { Participant } from './domain/participants/types'
import {
  defaultAppPreferences,
  type AppPreferences,
} from './domain/preferences/appPreferences'
import type { LocalBackup } from './domain/backup/localBackup'
import { standardRoutineTiming } from './domain/timer/standardRoutine'
import { buildWorkoutSequence } from './domain/timer/sequence'
import type { WorkoutState } from './domain/timer/types'
import {
  clearWorkoutCheckpoint,
  readWorkoutCheckpointRoutineId,
  restoreWorkoutCheckpoint,
  saveWorkoutCheckpoint,
} from './domain/timer/workoutPersistence'
import { PreWorkoutReview } from './presentation/PreWorkoutReview'
import { PwaUpdatePrompt } from './presentation/PwaUpdatePrompt'
import { RoutineLibrary } from './presentation/RoutineLibrary'
import type { RoutineEditorMode } from './presentation/RoutineEditor'
import type { ContentPackImportResult } from './presentation/ContentPackLibrary'
import { WorkoutRunner } from './presentation/WorkoutRunner'
import { formatClock } from './presentation/timerPresentation'
import { primeTimerAudio } from './presentation/timerAudio'
import { primeSpokenMotivation } from './presentation/spokenMotivation'
import type { SettingsPreferencePatch } from './presentation/SettingsScreen'
import { useScreenWakeLock, wakeLockNotice } from './presentation/useScreenWakeLock'

type Screen =
  | 'loading'
  | 'home'
  | 'editor'
  | 'personalityManager'
  | 'personalityPicker'
  | 'participants'
  | 'settings'
  | 'preworkout'
  | 'active'
  | 'complete'
const LEGACY_STANDARD_ROUTINE_ID = 'protected-standard'
const RoutineEditor = lazy(async () => {
  const module = await import('./presentation/RoutineEditor')
  return { default: module.RoutineEditor }
})
const ContentPackLibrary = lazy(async () => {
  const module = await import('./presentation/ContentPackLibrary')
  return { default: module.ContentPackLibrary }
})
const PersonalityPicker = lazy(async () => {
  const module = await import('./presentation/PersonalityPicker')
  return { default: module.PersonalityPicker }
})
const ParticipantAttendance = lazy(async () => {
  const module = await import('./presentation/ParticipantAttendance')
  return { default: module.ParticipantAttendance }
})
const SettingsScreen = lazy(async () => {
  const module = await import('./presentation/SettingsScreen')
  return { default: module.SettingsScreen }
})

interface EditorState {
  readonly mode: RoutineEditorMode
  readonly source?: Routine
}

interface AppProps {
  timerSoundsEnabled?: boolean
  themeId?: string
  onPreferencesChanged?: (preferences: AppPreferences) => void
  loadRoutines?: () => Promise<readonly Routine[]>
  createRoutine?: (input: RoutineInput) => Promise<UserRoutine>
  updateRoutine?: (id: string, input: RoutineInput) => Promise<UserRoutine>
  deleteRoutine?: (id: string) => Promise<void>
  loadContentPacks?: () => Promise<{
    readonly packs: readonly ContentPack[]
    readonly selectedId: string | null
    readonly spokenMotivationEnabled?: boolean
    readonly allowOnlineVoices?: boolean
    readonly voiceId?: string | null
    readonly speechRate?: number
    readonly timerSoundsEnabled?: boolean
    readonly transitionVolume?: number
    readonly voiceVolume?: number
  }>
  selectContentPack?: (id: string | null) => Promise<void>
  importContentPack?: (draft: ContentPackDraft) => Promise<ContentPack>
  replaceContentPack?: (id: string, draft: ContentPackDraft) => Promise<ContentPack>
  renameContentPack?: (id: string, name: string) => Promise<ContentPack>
  deleteContentPack?: (id: string, selected: boolean) => Promise<void>
  loadParticipants?: () => Promise<{
    readonly participants: readonly Participant[]
    readonly activeIds: readonly string[]
  }>
  saveAttendance?: (ids: readonly string[]) => Promise<readonly string[]>
  createParticipant?: (name: string) => Promise<Participant>
  renameParticipant?: (id: string, name: string) => Promise<Participant>
  deleteParticipant?: (id: string) => Promise<void>
  updatePreferences?: (
    patch: Partial<AppPreferences>,
  ) => Promise<AppPreferences>
  exportLocalBackup?: () => Promise<LocalBackup>
  restoreLocalBackup?: (backup: LocalBackup) => Promise<void>
}

const loadStoredRoutines = async () => {
  const { routineRepository } = await import('./data/routineRepository')
  return routineRepository.list()
}

const createStoredRoutine = async (input: RoutineInput) => {
  const { routineRepository } = await import('./data/routineRepository')
  return routineRepository.create(input)
}

const updateStoredRoutine = async (id: string, input: RoutineInput) => {
  const { routineRepository } = await import('./data/routineRepository')
  return routineRepository.update(id, input)
}

const deleteStoredRoutine = async (id: string) => {
  const { routineRepository } = await import('./data/routineRepository')
  return routineRepository.delete(id)
}

const loadStoredContentPacks = async () => {
  const { contentPackService } = await import('./data/contentPackService')
  const state = await contentPackService.load()
  const requestedId = state.preferences.selectedContentPackId
  const selectedId =
    requestedId !== null && state.packs.some(({ id }) => id === requestedId)
      ? requestedId
      : null
  if (requestedId !== selectedId) await contentPackService.select(null)
  return {
    packs: state.packs,
    selectedId,
    spokenMotivationEnabled: state.preferences.spokenMotivationEnabled,
    allowOnlineVoices: state.preferences.allowOnlineVoices,
    voiceId: state.preferences.voiceId,
    speechRate: state.preferences.speechRate,
    timerSoundsEnabled: state.preferences.timerSoundsEnabled,
    transitionVolume: state.preferences.transitionVolume,
    voiceVolume: state.preferences.voiceVolume,
  }
}

const selectStoredContentPack = async (id: string | null) => {
  const { contentPackService } = await import('./data/contentPackService')
  return contentPackService.select(id)
}

const importStoredContentPack = async (draft: ContentPackDraft) => {
  const { contentPackService } = await import('./data/contentPackService')
  return contentPackService.create(draft)
}

const replaceStoredContentPack = async (id: string, draft: ContentPackDraft) => {
  const { contentPackService } = await import('./data/contentPackService')
  return contentPackService.replace(id, draft)
}

const renameStoredContentPack = async (id: string, name: string) => {
  const { contentPackRepository } = await import('./data/contentPackRepository')
  return contentPackRepository.rename(id, name)
}

const deleteStoredContentPack = async (id: string, selected: boolean) => {
  const { contentPackService } = await import('./data/contentPackService')
  return contentPackService.remove(id, selected)
}

const loadStoredParticipants = async () => {
  const { participantService } = await import('./data/participantService')
  return participantService.load()
}

const saveStoredAttendance = async (ids: readonly string[]) => {
  const { participantService } = await import('./data/participantService')
  return participantService.saveAttendance(ids)
}

const createStoredParticipant = async (name: string) => {
  const { participantService } = await import('./data/participantService')
  return participantService.createAndActivate(name)
}

const renameStoredParticipant = async (id: string, name: string) => {
  const { participantService } = await import('./data/participantService')
  return participantService.rename(id, name)
}

const deleteStoredParticipant = async (id: string) => {
  const { participantService } = await import('./data/participantService')
  return participantService.remove(id)
}

const updateStoredPreferences = async (patch: Partial<AppPreferences>) => {
  const { preferencesRepository } = await import('./data/preferencesRepository')
  return preferencesRepository.update(patch)
}

const exportStoredLocalBackup = async () => {
  const { localBackupService } = await import('./data/localBackupService')
  return localBackupService.export()
}

const restoreStoredLocalBackup = async (backup: LocalBackup) => {
  const { localBackupService } = await import('./data/localBackupService')
  await localBackupService.restore(backup)
  window.location.reload()
}

const contentPackConflict = (
  error: unknown,
): error is { readonly conflictingPack: ContentPack } =>
  error instanceof Error &&
  error.name === 'ContentPackNameConflictError' &&
  'conflictingPack' in error

export function App({
  timerSoundsEnabled: initialTimerSoundsEnabled = true,
  themeId = defaultAppPreferences.themeId,
  onPreferencesChanged,
  loadRoutines = loadStoredRoutines,
  createRoutine = createStoredRoutine,
  updateRoutine = updateStoredRoutine,
  deleteRoutine = deleteStoredRoutine,
  loadContentPacks = loadStoredContentPacks,
  selectContentPack = selectStoredContentPack,
  importContentPack = importStoredContentPack,
  replaceContentPack = replaceStoredContentPack,
  renameContentPack = renameStoredContentPack,
  deleteContentPack = deleteStoredContentPack,
  loadParticipants = loadStoredParticipants,
  saveAttendance = saveStoredAttendance,
  createParticipant = createStoredParticipant,
  renameParticipant = renameStoredParticipant,
  deleteParticipant = deleteStoredParticipant,
  updatePreferences = updateStoredPreferences,
  exportLocalBackup = exportStoredLocalBackup,
  restoreLocalBackup = restoreStoredLocalBackup,
}: AppProps) {
  const [screen, setScreen] = useState<Screen>('loading')
  const [routines, setRoutines] = useState<readonly Routine[]>([])
  const [selectedRoutine, setSelectedRoutine] = useState<Routine>()
  const [editor, setEditor] = useState<EditorState>()
  const [contentPacks, setContentPacks] = useState<readonly ContentPack[]>([])
  const [selectedContentPackId, setSelectedContentPackId] = useState<string | null>(null)
  const [contentPackNotice, setContentPackNotice] = useState<string>()
  const [spokenMotivationEnabled, setSpokenMotivationEnabled] = useState(true)
  const [timerSoundsEnabled, setTimerSoundsEnabled] = useState(initialTimerSoundsEnabled)
  const [transitionVolume, setTransitionVolume] = useState(
    defaultAppPreferences.transitionVolume,
  )
  const [allowOnlineVoices, setAllowOnlineVoices] = useState(false)
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null)
  const [speechRate, setSpeechRate] = useState(1)
  const [voiceVolume, setVoiceVolume] = useState(defaultAppPreferences.voiceVolume)
  const [participants, setParticipants] = useState<readonly Participant[]>([])
  const [activeParticipantIds, setActiveParticipantIds] = useState<readonly string[]>([])
  const [participantNotice, setParticipantNotice] = useState<string>()
  const [storageNotice, setStorageNotice] = useState<string>()
  const [initialWorkout, setInitialWorkout] = useState<WorkoutState>()
  const [initialActiveElapsedMs, setInitialActiveElapsedMs] = useState(0)
  const [completedWorkoutMs, setCompletedWorkoutMs] = useState(0)
  const [recoveryMessage, setRecoveryMessage] = useState<string>()
  const [recoveryWarning, setRecoveryWarning] = useState(false)
  const [settingsReturnScreen, setSettingsReturnScreen] = useState<'home' | 'preworkout'>('home')
  const [participantReturnScreen, setParticipantReturnScreen] = useState<'settings' | 'preworkout'>('preworkout')

  const sequence = useMemo(
    () =>
      selectedRoutine === undefined
        ? []
        : buildWorkoutSequence(selectedRoutine.timing),
    [selectedRoutine],
  )
  const wakeLockStatus = useScreenWakeLock(
    screen === 'active' || screen === 'complete',
  )
  const wakeLockMessage = wakeLockNotice(wakeLockStatus)

  useEffect(() => {
    let active = true
    const showLoadedRoutines = (loadedRoutines: readonly Routine[]) => {
      if (!active) return
      setRoutines(loadedRoutines)

      const checkpointRoutineId = readWorkoutCheckpointRoutineId()
      if (checkpointRoutineId === undefined) {
        setScreen('home')
        return
      }

      const recoveryRoutine =
        checkpointRoutineId === LEGACY_STANDARD_ROUTINE_ID
          ? loadedRoutines.find(({ ownership }) => ownership === 'protected')
          : loadedRoutines.find(({ id }) => id === checkpointRoutineId)
      if (recoveryRoutine === undefined) {
        clearWorkoutCheckpoint()
        setStorageNotice(
          'An interrupted workout could not be restored because its routine is unavailable.',
        )
        setScreen('home')
        return
      }

      const restored = restoreWorkoutCheckpoint(
        checkpointRoutineId,
        buildWorkoutSequence(recoveryRoutine.timing),
        Date.now(),
        performance.now(),
      )
      if (restored === undefined) {
        setScreen('home')
        return
      }

      setSelectedRoutine(recoveryRoutine)
      setInitialWorkout(
        restored.workout.status === 'complete'
          ? undefined
          : restored.workout,
      )
      setInitialActiveElapsedMs(restored.activeElapsedMs)
      setCompletedWorkoutMs(
        restored.workout.status === 'complete'
          ? restored.activeElapsedMs
          : 0,
      )
      setRecoveryMessage(restored.notice)
      setRecoveryWarning(restored.accuracyWarning)
      setScreen(
        restored.workout.status === 'complete' ? 'complete' : 'active',
      )
    }

    void loadRoutines()
      .then(showLoadedRoutines)
      .catch(() => {
        if (!active) return
        setStorageNotice(
          'Saved routines are unavailable on this device. The protected preset remains usable.',
        )
        showLoadedRoutines([protectedStandardRoutine])
      })
    return () => {
      active = false
    }
  }, [loadRoutines])

  useEffect(() => {
    let active = true
    void loadContentPacks()
      .then((state) => {
        if (!active) return
        setContentPacks(state.packs)
        setSelectedContentPackId(state.selectedId)
        if (state.spokenMotivationEnabled !== undefined) {
          setSpokenMotivationEnabled(state.spokenMotivationEnabled)
        }
        if (state.allowOnlineVoices !== undefined) {
          setAllowOnlineVoices(state.allowOnlineVoices)
        }
        if (state.voiceId !== undefined) setSelectedVoiceId(state.voiceId)
        if (state.speechRate !== undefined) setSpeechRate(state.speechRate)
        if (state.timerSoundsEnabled !== undefined) {
          setTimerSoundsEnabled(state.timerSoundsEnabled)
        }
        if (state.transitionVolume !== undefined) {
          setTransitionVolume(state.transitionVolume)
        }
        if (state.voiceVolume !== undefined) setVoiceVolume(state.voiceVolume)
      })
      .catch(() => {
        if (!active) return
        setContentPackNotice(
          'Saved Personality packs are unavailable on this device. The timer remains usable.',
        )
      })
    return () => {
      active = false
    }
  }, [loadContentPacks])

  useEffect(() => {
    let active = true
    void loadParticipants()
      .then((state) => {
        if (!active) return
        setParticipants(state.participants)
        setActiveParticipantIds(state.activeIds)
      })
      .catch(() => {
        if (!active) return
        setParticipantNotice(
          'Saved participants are unavailable on this device. Workouts remain usable without names.',
        )
      })
    return () => {
      active = false
    }
  }, [loadParticipants])

  const dismissRecovery = () => {
    setRecoveryMessage(undefined)
    setRecoveryWarning(false)
  }

  if (screen === 'loading') {
    return (
      <Box
        component="main"
        sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}
      >
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <CircularProgress />
          <Typography color="text.secondary">Loading routines…</Typography>
        </Stack>
      </Box>
    )
  }

  if (screen === 'home') {
    return (
      <>
        <RoutineLibrary
          routines={routines}
          storageNotice={storageNotice}
          onSelect={(routine) => {
            setSelectedRoutine(routine)
            setScreen('preworkout')
          }}
          onCreate={() => {
            setEditor({ mode: 'create' })
            setScreen('editor')
          }}
          onSettings={() => {
            setSettingsReturnScreen('home')
            setScreen('settings')
          }}
        />
        <PwaUpdatePrompt activationAllowed />
      </>
    )
  }

  if (screen === 'editor' && editor !== undefined) {
    const source = editor.source
    const initialName =
      editor.mode === 'create'
        ? ''
        : editor.mode === 'edit'
          ? (source?.name ?? '')
          : `${source?.name ?? 'Routine'} Copy`
    const initialTiming = source?.timing ?? standardRoutineTiming

    return (
      <>
        <Suspense
          fallback={
            <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
              <CircularProgress aria-label="Loading routine editor" />
            </Box>
          }
        >
          <RoutineEditor
            key={`${editor.mode}:${source?.id ?? 'new'}`}
            mode={editor.mode}
            initialName={initialName}
            initialTiming={initialTiming}
            onCancel={() => {
              setEditor(undefined)
              setScreen(source === undefined ? 'home' : 'preworkout')
            }}
            onSave={async (input) => {
              const saved =
                editor.mode === 'edit' && source?.ownership === 'user'
                  ? await updateRoutine(source.id, input)
                  : await createRoutine(input)
              setRoutines((current) =>
                editor.mode === 'edit'
                  ? current.map((routine) =>
                      routine.id === saved.id ? saved : routine,
                    )
                  : [...current, saved],
              )
              setSelectedRoutine(saved)
              setEditor(undefined)
              setScreen('preworkout')
            }}
          />
        </Suspense>
        <PwaUpdatePrompt activationAllowed />
      </>
    )
  }

  if (screen === 'settings') {
    return (
      <>
        <Suspense
          fallback={
            <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
              <CircularProgress aria-label="Loading settings" />
            </Box>
          }
        >
          <SettingsScreen
            themeId={themeId}
            timerSoundsEnabled={timerSoundsEnabled}
            transitionVolume={transitionVolume}
            spokenMotivationEnabled={spokenMotivationEnabled}
            voiceVolume={voiceVolume}
            allowOnlineVoices={allowOnlineVoices}
            voiceId={selectedVoiceId}
            speechRate={speechRate}
            voiceInstructions={
              contentPacks.find(({ id }) => id === selectedContentPackId)
                ?.voiceInstructions
            }
            participantCount={participants.length}
            personalityCount={contentPacks.length}
            onBack={() => setScreen(settingsReturnScreen)}
            onParticipants={() => {
              setParticipantReturnScreen('settings')
              setScreen('participants')
            }}
            onPersonalities={() => setScreen('personalityManager')}
            onChange={async (patch: Partial<SettingsPreferencePatch>) => {
              const saved = await updatePreferences(patch)
              setTimerSoundsEnabled(saved.timerSoundsEnabled)
              setTransitionVolume(saved.transitionVolume)
              setSpokenMotivationEnabled(saved.spokenMotivationEnabled)
              setVoiceVolume(saved.voiceVolume)
              setAllowOnlineVoices(saved.allowOnlineVoices)
              setSelectedVoiceId(saved.voiceId)
              setSpeechRate(saved.speechRate)
              onPreferencesChanged?.(saved)
            }}
            onExportBackup={exportLocalBackup}
            onRestoreBackup={restoreLocalBackup}
          />
        </Suspense>
        <PwaUpdatePrompt activationAllowed />
      </>
    )
  }

  if (screen === 'participants') {
    return (
      <>
        <Suspense
          fallback={
            <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
              <CircularProgress aria-label="Loading participants" />
            </Box>
          }
        >
          <ParticipantAttendance
            participants={participants}
            activeIds={activeParticipantIds}
            storageNotice={participantNotice}
            onBack={() => setScreen(participantReturnScreen)}
            onSave={async (ids) => {
              const saved = await saveAttendance(ids)
              setActiveParticipantIds(saved)
              setScreen(participantReturnScreen)
            }}
            onAdd={async (name) => {
              const created = await createParticipant(name)
              setParticipants((current) => [...current, created])
              setActiveParticipantIds((current) => [...current, created.id])
              return created
            }}
            onRename={async (id, name) => {
              const renamed = await renameParticipant(id, name)
              setParticipants((current) =>
                current.map((participant) =>
                  participant.id === renamed.id ? renamed : participant,
                ),
              )
              return renamed
            }}
            onDelete={async (id) => {
              await deleteParticipant(id)
              setParticipants((current) =>
                current.filter((participant) => participant.id !== id),
              )
              setActiveParticipantIds((current) =>
                current.filter((activeId) => activeId !== id),
              )
            }}
          />
        </Suspense>
        <PwaUpdatePrompt activationAllowed />
      </>
    )
  }

  if (screen === 'personalityManager') {
    return (
      <>
        <Suspense
          fallback={
            <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
              <CircularProgress aria-label="Loading Personality library" />
            </Box>
          }
        >
          <ContentPackLibrary
            packs={contentPacks}
            storageNotice={contentPackNotice}
            onBack={() => setScreen('settings')}
            onImport={async (draft): Promise<ContentPackImportResult> => {
              try {
                const saved = await importContentPack(draft)
                setContentPacks((current) => [...current, saved])
                return { status: 'saved', pack: saved }
              } catch (error) {
                if (contentPackConflict(error)) {
                  return { status: 'conflict', existing: error.conflictingPack }
                }
                throw error
              }
            }}
            onReplace={async (id, draft) => {
              const saved = await replaceContentPack(id, draft)
              setContentPacks((current) =>
                current.map((pack) => (pack.id === saved.id ? saved : pack)),
              )
            }}
            onRename={async (id, name) => {
              const renamed = await renameContentPack(id, name)
              setContentPacks((current) =>
                current.map((pack) => (pack.id === renamed.id ? renamed : pack)),
              )
              return renamed
            }}
            onDelete={async (id) => {
              const selected = selectedContentPackId === id
              await deleteContentPack(id, selected)
              setContentPacks((current) => current.filter((pack) => pack.id !== id))
              if (selected) setSelectedContentPackId(null)
            }}
          />
        </Suspense>
        <PwaUpdatePrompt activationAllowed />
      </>
    )
  }

  if (selectedRoutine === undefined) return null

  if (screen === 'personalityPicker') {
    return (
      <>
        <Suspense
          fallback={
            <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
              <CircularProgress aria-label="Loading Personality picker" />
            </Box>
          }
        >
          <PersonalityPicker
            packs={contentPacks}
            selectedId={selectedContentPackId}
            storageNotice={contentPackNotice}
            onBack={() => setScreen('preworkout')}
            onSelect={async (id) => {
              await selectContentPack(id)
              setSelectedContentPackId(id)
              setScreen('preworkout')
            }}
          />
        </Suspense>
        <PwaUpdatePrompt activationAllowed />
      </>
    )
  }

  if (screen === 'active') {
    return (
      <>
        <WorkoutRunner
          key={selectedRoutine.id}
          phases={sequence}
          timing={selectedRoutine.timing}
          initialWorkout={initialWorkout}
          initialActiveElapsedMs={initialActiveElapsedMs}
          soundsEnabled={timerSoundsEnabled}
          transitionVolume={transitionVolume}
          motivation={(() => {
            const pack = contentPacks.find(
              ({ id }) => id === selectedContentPackId,
            )
            if (pack === undefined) return undefined
            const activeIds = new Set(activeParticipantIds)
            return {
              pack,
              participants: participants.filter(({ id }) => activeIds.has(id)),
              enabled: spokenMotivationEnabled,
              speech: {
                allowOnlineVoices,
                voiceId: selectedVoiceId,
                rate: speechRate,
                volume: voiceVolume,
              },
            }
          })()}
          wakeLockMessage={wakeLockMessage}
          recoveryMessage={recoveryMessage}
          recoveryWarning={recoveryWarning}
          onCheckpoint={(workout, activeElapsedMs) =>
            saveWorkoutCheckpoint(
              selectedRoutine.id,
              workout,
              activeElapsedMs,
            )
          }
          onComplete={(activeElapsedMs) => {
            saveWorkoutCheckpoint(
              selectedRoutine.id,
              { status: 'complete', phases: sequence },
              activeElapsedMs,
            )
            setCompletedWorkoutMs(activeElapsedMs)
            setInitialWorkout(undefined)
            setInitialActiveElapsedMs(0)
            setScreen('complete')
          }}
          onDismissRecovery={dismissRecovery}
          onEnd={() => {
            clearWorkoutCheckpoint()
            setInitialWorkout(undefined)
            setInitialActiveElapsedMs(0)
            dismissRecovery()
            setScreen('preworkout')
          }}
        />
        <PwaUpdatePrompt activationAllowed={false} />
      </>
    )
  }

  if (screen === 'complete') {
    return (
      <Box
        component="main"
        sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 3 }}
      >
        <Container maxWidth="sm">
          <Paper variant="outlined" sx={{ p: { xs: 3, sm: 5 }, textAlign: 'center' }}>
            <Stack spacing={3} sx={{ alignItems: 'center' }}>
              <Chip label="Workout complete" color="primary" />
              <Typography variant="h1" sx={{ fontSize: { xs: '3rem', sm: '4.5rem' } }}>
                Complete
              </Typography>
              <Typography variant="h5" color="text.secondary">
                The wheel is conquered.
              </Typography>
              <Typography>
                Workout time: {formatClock(completedWorkoutMs)}
              </Typography>
              {wakeLockMessage && (
                <Typography color="warning.main">{wakeLockMessage}</Typography>
              )}
              {recoveryMessage && (
                <Typography
                  color={recoveryWarning ? 'warning.main' : 'info.main'}
                  role="status"
                >
                  {recoveryMessage}
                </Typography>
              )}
              <Button
                variant="contained"
                size="large"
                onClick={() => {
                  clearWorkoutCheckpoint()
                  dismissRecovery()
                  setScreen('preworkout')
                }}
              >
                Done
              </Button>
            </Stack>
          </Paper>
        </Container>
        <PwaUpdatePrompt activationAllowed />
      </Box>
    )
  }

  return (
    <>
      <PreWorkoutReview
        routine={selectedRoutine}
        onBack={() => {
          setSelectedRoutine(undefined)
          setScreen('home')
        }}
        onPlay={() => {
          clearWorkoutCheckpoint()
          setInitialWorkout(undefined)
          setInitialActiveElapsedMs(0)
          dismissRecovery()
          primeTimerAudio()
          primeSpokenMotivation()
          setScreen('active')
        }}
        onCustomize={() => {
          setEditor({ mode: 'customize', source: selectedRoutine })
          setScreen('editor')
        }}
        onEdit={() => {
          setEditor({ mode: 'edit', source: selectedRoutine })
          setScreen('editor')
        }}
        onDuplicate={() => {
          setEditor({ mode: 'duplicate', source: selectedRoutine })
          setScreen('editor')
        }}
        onDelete={async () => {
          try {
            await deleteRoutine(selectedRoutine.id)
            setRoutines((current) =>
              current.filter(({ id }) => id !== selectedRoutine.id),
            )
            setSelectedRoutine(undefined)
            setScreen('home')
          } catch (error) {
            setStorageNotice('The routine could not be deleted from this device.')
            throw error
          }
        }}
        personalityName={
          contentPacks.find(({ id }) => id === selectedContentPackId)?.name ?? null
        }
        onChoosePersonality={() => setScreen('personalityPicker')}
        activeParticipantCount={activeParticipantIds.length}
        onChooseParticipants={() => {
          setParticipantReturnScreen('preworkout')
          setScreen('participants')
        }}
        onSettings={() => {
          setSettingsReturnScreen('preworkout')
          setScreen('settings')
        }}
      />
      <PwaUpdatePrompt activationAllowed />
    </>
  )
}
