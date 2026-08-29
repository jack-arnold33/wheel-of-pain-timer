import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  InvalidLocalBackupError,
  parseLocalBackupFile,
  type LocalBackup,
} from '../domain/backup/localBackup'
import { defaultAppPreferences } from '../domain/preferences/appPreferences'
import { standardRoutineTiming } from '../domain/timer/standardRoutine'
import { APP_PREFERENCES_ID, WheelOfPainDatabase } from './database'
import { LocalBackupService } from './localBackupService'
import { PreferencesRepository } from './preferencesRepository'

let database: WheelOfPainDatabase
let service: LocalBackupService

const backup = (): LocalBackup => ({
  schemaVersion: 1,
  routines: [
    {
      id: 'routine:backup',
      name: 'Backup Routine',
      timing: standardRoutineTiming,
      createdAt: 10,
      updatedAt: 20,
    },
  ],
  contentPacks: [
    {
      id: 'pack:backup',
      schemaVersion: 1,
      name: 'Backup Pack',
      sayings: { work: ['Keep moving.'] },
      extensions: {},
      createdAt: 10,
      updatedAt: 20,
    },
  ],
  participants: [
    {
      id: 'participant:backup',
      name: 'Jarno',
      createdAt: 10,
      updatedAt: 20,
    },
  ],
  preferences: {
    ...defaultAppPreferences,
    timerSoundsEnabled: false,
    selectedContentPackId: 'pack:backup',
    activeParticipantIds: ['participant:backup'],
  },
})

beforeEach(() => {
  database = new WheelOfPainDatabase(`local-backup-${crypto.randomUUID()}`)
  const preferences = new PreferencesRepository(database)
  service = new LocalBackupService(database, preferences)
})

afterEach(async () => {
  await database.delete()
})

describe('local backup service', () => {
  it('exports all user collections without an app-supplied routine or pack', async () => {
    const source = backup()
    await database.routines.bulkPut([...source.routines])
    await database.contentPacks.bulkPut([...source.contentPacks])
    await database.participants.bulkPut([...source.participants])
    await database.preferences.put({
      id: APP_PREFERENCES_ID,
      ...source.preferences,
    })

    expect(await service.export()).toEqual(source)
  })

  it('atomically replaces every local collection after complete validation', async () => {
    await database.routines.add({
      id: 'routine:old',
      name: 'Old Routine',
      timing: standardRoutineTiming,
      createdAt: 1,
      updatedAt: 1,
    })

    const source = backup()
    await service.restore(source)

    expect(await database.routines.toArray()).toEqual(source.routines)
    expect(await database.contentPacks.toArray()).toEqual(source.contentPacks)
    expect(await database.participants.toArray()).toEqual(source.participants)
    expect(await database.preferences.get(APP_PREFERENCES_ID)).toEqual({
      id: APP_PREFERENCES_ID,
      ...source.preferences,
    })
  })

  it('rejects inconsistent attendance without changing existing data', async () => {
    await database.routines.add({
      id: 'routine:old',
      name: 'Old Routine',
      timing: standardRoutineTiming,
      createdAt: 1,
      updatedAt: 1,
    })
    const invalid = {
      ...backup(),
      preferences: {
        ...backup().preferences,
        activeParticipantIds: ['participant:missing'],
      },
    }

    await expect(service.restore(invalid)).rejects.toThrow(
      'Remembered attendance references a participant not contained in the backup.',
    )
    expect((await database.routines.toArray()).map(({ id }) => id)).toEqual([
      'routine:old',
    ])
    expect(await database.contentPacks.count()).toBe(0)
  })

  it('reports invalid JSON and unsupported versions', async () => {
    await expect(
      parseLocalBackupFile({ text: () => Promise.resolve('{broken') }),
    ).rejects.toThrow('The backup file is not valid JSON.')
    await expect(
      parseLocalBackupFile({
        text: () => Promise.resolve(JSON.stringify({ ...backup(), schemaVersion: 2 })),
      }),
    ).rejects.toBeInstanceOf(InvalidLocalBackupError)
  })
})
