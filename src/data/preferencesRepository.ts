import {
  defaultAppPreferences,
  type AppPreferences,
} from '../domain/preferences/appPreferences'
import {
  APP_PREFERENCES_ID,
  appDatabase,
  type AppPreferencesRecord,
  type WheelOfPainDatabase,
} from './database'
import { crewMotivationStyles, emptyCrewProfile } from '../domain/participants/types'

function normalizePreferences(
  stored: Partial<AppPreferencesRecord> | undefined,
): AppPreferencesRecord {
  return {
    id: APP_PREFERENCES_ID,
    themeId:
      typeof stored?.themeId === 'string'
        ? stored.themeId
        : defaultAppPreferences.themeId,
    timerSoundsEnabled:
      typeof stored?.timerSoundsEnabled === 'boolean'
        ? stored.timerSoundsEnabled
        : defaultAppPreferences.timerSoundsEnabled,
    transitionVolume:
      typeof stored?.transitionVolume === 'number' &&
      Number.isFinite(stored.transitionVolume) &&
      stored.transitionVolume >= 0 &&
      stored.transitionVolume <= 1
        ? stored.transitionVolume
        : defaultAppPreferences.transitionVolume,
    spokenMotivationEnabled:
      typeof stored?.spokenMotivationEnabled === 'boolean'
        ? stored.spokenMotivationEnabled
        : defaultAppPreferences.spokenMotivationEnabled,
    voiceVolume:
      typeof stored?.voiceVolume === 'number' &&
      Number.isFinite(stored.voiceVolume) &&
      stored.voiceVolume >= 0 &&
      stored.voiceVolume <= 1
        ? stored.voiceVolume
        : defaultAppPreferences.voiceVolume,
    openAiFeaturesEnabled:
      typeof stored?.openAiFeaturesEnabled === 'boolean'
        ? stored.openAiFeaturesEnabled
        : defaultAppPreferences.openAiFeaturesEnabled,
    useOpenAiVoice:
      typeof stored?.useOpenAiVoice === 'boolean'
        ? stored.useOpenAiVoice
        : defaultAppPreferences.useOpenAiVoice,
    voiceId: typeof stored?.voiceId === 'string' ? stored.voiceId : null,
    speechRate:
      typeof stored?.speechRate === 'number' &&
      Number.isFinite(stored.speechRate) &&
      stored.speechRate >= 0.5 &&
      stored.speechRate <= 2
        ? stored.speechRate
        : defaultAppPreferences.speechRate,
    selectedContentPackId:
      typeof stored?.selectedContentPackId === 'string'
        ? stored.selectedContentPackId
        : null,
    activeParticipantIds: Array.isArray(stored?.activeParticipantIds)
      ? stored.activeParticipantIds.filter(
          (id): id is string => typeof id === 'string',
        )
      : [],
    crewProfile: {
      name:
        typeof stored?.crewProfile?.name === 'string'
          ? stored.crewProfile.name.slice(0, 80)
          : emptyCrewProfile.name,
      about:
        typeof stored?.crewProfile?.about === 'string'
          ? stored.crewProfile.about.slice(0, 2_000)
          : emptyCrewProfile.about,
      motivationStyle: crewMotivationStyles.includes(
        stored?.crewProfile?.motivationStyle as never,
      )
        ? stored!.crewProfile!.motivationStyle
        : emptyCrewProfile.motivationStyle,
      avoid:
        typeof stored?.crewProfile?.avoid === 'string'
          ? stored.crewProfile.avoid.slice(0, 1_000)
          : emptyCrewProfile.avoid,
    },
  }
}

const withoutId = (record: AppPreferencesRecord): AppPreferences => ({
  themeId: record.themeId,
  timerSoundsEnabled: record.timerSoundsEnabled,
  transitionVolume: record.transitionVolume,
  spokenMotivationEnabled: record.spokenMotivationEnabled,
  voiceVolume: record.voiceVolume,
  openAiFeaturesEnabled: record.openAiFeaturesEnabled,
  useOpenAiVoice: record.useOpenAiVoice,
  voiceId: record.voiceId,
  speechRate: record.speechRate,
  selectedContentPackId: record.selectedContentPackId,
  activeParticipantIds: [...record.activeParticipantIds],
  crewProfile: { ...record.crewProfile },
})

export class PreferencesRepository {
  constructor(
    private readonly database: WheelOfPainDatabase = appDatabase,
  ) {}

  async get(): Promise<AppPreferences> {
    const stored = await this.database.preferences.get(APP_PREFERENCES_ID)
    const normalized = normalizePreferences(stored)
    await this.database.preferences.put(normalized)
    return withoutId(normalized)
  }

  async update(
    patch: Partial<AppPreferences>,
  ): Promise<AppPreferences> {
    const current = await this.database.preferences.get(APP_PREFERENCES_ID)
    const normalized = normalizePreferences({ ...current, ...patch })
    await this.database.preferences.put(normalized)
    return withoutId(normalized)
  }

  async reset(): Promise<AppPreferences> {
    const normalized = normalizePreferences(undefined)
    await this.database.preferences.put(normalized)
    return withoutId(normalized)
  }
}

export const preferencesRepository = new PreferencesRepository()
