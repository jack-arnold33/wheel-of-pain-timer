import Dexie, { type EntityTable } from 'dexie'
import type { AppPreferences } from '../domain/preferences/appPreferences'
import type {
  ContentPackSayings,
} from '../domain/contentPacks/types'
import type { RoutineTiming } from '../domain/timer/types'

export const DATABASE_NAME = 'wheel-of-pain'
export const APP_PREFERENCES_ID = 'app'

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
  readonly sayings: ContentPackSayings
  readonly extensions: Readonly<Record<string, unknown>>
  readonly createdAt: number
  readonly updatedAt: number
}

export class WheelOfPainDatabase extends Dexie {
  readonly routines!: EntityTable<UserRoutineRecord, 'id'>
  readonly preferences!: EntityTable<AppPreferencesRecord, 'id'>
  readonly contentPacks!: EntityTable<ContentPackRecord, 'id'>

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
  }
}

export const appDatabase = new WheelOfPainDatabase()
