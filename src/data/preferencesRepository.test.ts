import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { defaultAppPreferences } from '../domain/preferences/appPreferences'
import { resolveTheme } from '../presentation/themes/registry'
import { APP_PREFERENCES_ID, WheelOfPainDatabase } from './database'
import { PreferencesRepository } from './preferencesRepository'

let database: WheelOfPainDatabase
let repository: PreferencesRepository
let databaseName: string

beforeEach(() => {
  databaseName = `preferences-test-${crypto.randomUUID()}`
  database = new WheelOfPainDatabase(databaseName)
  repository = new PreferencesRepository(database)
})

afterEach(async () => {
  await database.delete()
})

describe('preferences repository', () => {
  it('seeds stable device-local defaults on first use', async () => {
    expect(await repository.get()).toEqual(defaultAppPreferences)
    expect(await database.preferences.get(APP_PREFERENCES_ID)).toEqual({
      id: APP_PREFERENCES_ID,
      ...defaultAppPreferences,
    })
  })

  it('persists updates for a later repository instance', async () => {
    await repository.update({
      timerSoundsEnabled: false,
      activeParticipantIds: ['participant:one'],
    })

    database.close()
    database = new WheelOfPainDatabase(databaseName)
    const reopened = new PreferencesRepository(database)
    expect(await reopened.get()).toMatchObject({
      timerSoundsEnabled: false,
      activeParticipantIds: ['participant:one'],
    })
  })

  it('retains a stable future theme identifier while presentation falls back', async () => {
    const stored = await repository.update({ themeId: 'future-theme' })

    expect(stored.themeId).toBe('future-theme')
    expect(resolveTheme(stored.themeId).id).toBe('wheel-of-pain')
  })

  it('fills missing or invalid preference fields with safe defaults', async () => {
    await database.table('preferences').put({
      id: APP_PREFERENCES_ID,
      themeId: 'wheel-of-pain',
      timerSoundsEnabled: 'not-a-boolean',
      speechRate: 99,
      transitionVolume: -1,
      voiceVolume: 2,
    })

    const preferences = await repository.get()

    expect(preferences.timerSoundsEnabled).toBe(true)
    expect(preferences.speechRate).toBe(1)
    expect(preferences.transitionVolume).toBe(0.5)
    expect(preferences.voiceVolume).toBe(1)
    expect(preferences.activeParticipantIds).toEqual([])
  })

  it('resets preferences without touching routines', async () => {
    await repository.update({ timerSoundsEnabled: false })
    await database.routines.add({
      id: 'routine:one',
      name: 'One',
      timing: {
        prepareSeconds: 0,
        workSeconds: 10,
        exerciseRestSeconds: 0,
        exercisesPerRound: 1,
        roundsPerCycle: 1,
        cycles: 1,
        cycleRestSeconds: 0,
        cooldownSeconds: 0,
      },
      createdAt: 1,
      updatedAt: 1,
    })

    expect(await repository.reset()).toEqual(defaultAppPreferences)
    expect(await database.routines.count()).toBe(1)
  })
})
