import Dexie, { type EntityTable } from 'dexie'
import type { AppPreferences } from '../domain/preferences/appPreferences'
import type {
  ContentPackSayings,
} from '../domain/contentPacks/types'
import type { RoutineTiming } from '../domain/timer/types'

export const DATABASE_NAME = 'wheel-of-pain'
export const APP_PREFERENCES_ID = 'app'
export const OPENAI_CREDENTIAL_ID = 'openai'

export interface UserRoutineRecord {
  readonly id: string
  readonly name: string
  readonly timing: RoutineTiming
  readonly createdAt: number
  readonly updatedAt: number
}

export interface AppPreferencesRecord extends AppPreferences {
  readonly id: typeof APP_PREFERENCES_ID
}

export interface ContentPackRecord {
  readonly id: string
  readonly schemaVersion: 1
  readonly name: string
  readonly voiceInstructions?: string
  readonly sayings: ContentPackSayings
  readonly extensions: Readonly<Record<string, unknown>>
  readonly createdAt: number
  readonly updatedAt: number
}

export interface ParticipantRecord {
  readonly id: string
  readonly name: string
  readonly spokenName?: string
  readonly about?: string
  readonly createdAt: number
  readonly updatedAt: number
}

export interface OpenAiCredentialRecord {
  readonly id: typeof OPENAI_CREDENTIAL_ID
  readonly apiKey: string
  readonly lastFour: string
  readonly updatedAt: number
}

export class WheelOfPainDatabase extends Dexie {
  readonly routines!: EntityTable<UserRoutineRecord, 'id'>
  readonly preferences!: EntityTable<AppPreferencesRecord, 'id'>
  readonly contentPacks!: EntityTable<ContentPackRecord, 'id'>
  readonly participants!: EntityTable<ParticipantRecord, 'id'>
  readonly credentials!: EntityTable<OpenAiCredentialRecord, 'id'>

  constructor(name = DATABASE_NAME) {
    super(name)
    this.version(1).stores({
      routines: '&id, name, updatedAt',
      preferences: '&id',
    })
    this.version(2).stores({
      routines: '&id, name, updatedAt',
      preferences: '&id',
      contentPacks: '&id, name, updatedAt',
    })
    this.version(3).stores({
      routines: '&id, name, updatedAt',
      preferences: '&id',
      contentPacks: '&id, name, updatedAt',
      participants: '&id, name, updatedAt',
    })
    this.version(4).stores({
      routines: '&id, name, updatedAt',
      preferences: '&id',
      contentPacks: '&id, name, updatedAt',
      participants: '&id, name, updatedAt',
      credentials: '&id',
    })
    // Version 5 briefly introduced crew-personalized content. Keep the version
    // declaration so devices that opened that build can still open the database.
    this.version(5).stores({
      routines: '&id, name, updatedAt',
      preferences: '&id',
      contentPacks: '&id, name, updatedAt',
      participants: '&id, name, updatedAt',
      credentials: '&id',
    })
    this.version(6).stores({
      routines: '&id, name, updatedAt',
      preferences: '&id',
      contentPacks: '&id, name, updatedAt',
      participants: '&id, name, updatedAt',
      credentials: '&id',
    }).upgrade(async (transaction) => {
      await transaction.table('contentPacks').toCollection().modify((pack) => {
        if (pack.schemaVersion === 2) {
          pack.schemaVersion = 1
          delete pack.addressingMode
        }
      })
      await transaction.table('preferences').toCollection().modify((preferences) => {
        if (
          typeof preferences.allowOnlineVoices !== 'boolean' &&
          typeof preferences.useOpenAiVoice === 'boolean'
        ) {
          preferences.allowOnlineVoices = preferences.useOpenAiVoice
        }
        delete preferences.openAiFeaturesEnabled
        delete preferences.useOpenAiVoice
        delete preferences.crewProfile
      })
      await transaction.table('participants').toCollection().modify((participant) => {
        delete participant.motivationStyle
        delete participant.avoid
      })
    })
  }
}

export const appDatabase = new WheelOfPainDatabase()
