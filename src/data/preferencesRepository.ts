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
    spokenMotivationEnabled:
      typeof stored?.spokenMotivationEnabled === 'boolean'
        ? stored.spokenMotivationEnabled
        : defaultAppPreferences.spokenMotivationEnabled,
    allowOnlineVoices:
      typeof stored?.allowOnlineVoices === 'boolean'
        ? stored.allowOnlineVoices
        : defaultAppPreferences.allowOnlineVoices,
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
  }
}

const withoutId = (record: AppPreferencesRecord): AppPreferences => ({
  themeId: record.themeId,
  timerSoundsEnabled: record.timerSoundsEnabled,
  spokenMotivationEnabled: record.spokenMotivationEnabled,
  allowOnlineVoices: record.allowOnlineVoices,
  voiceId: record.voiceId,
  speechRate: record.speechRate,
  selectedContentPackId: record.selectedContentPackId,
  activeParticipantIds: [...record.activeParticipantIds],
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
