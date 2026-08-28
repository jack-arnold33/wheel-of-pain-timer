import Dexie, { type EntityTable } from 'dexie'
import type { AppPreferences } from '../domain/preferences/appPreferences'
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

export class WheelOfPainDatabase extends Dexie {
  readonly routines!: EntityTable<UserRoutineRecord, 'id'>
  readonly preferences!: EntityTable<AppPreferencesRecord, 'id'>

  constructor(name = DATABASE_NAME) {
    super(name)
    this.version(1).stores({
      routines: '&id, name, updatedAt',
      preferences: '&id',
    })
  }
}

export const appDatabase = new WheelOfPainDatabase()
