import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { WheelOfPainDatabase } from './database'

const databaseNames: string[] = []

afterEach(async () => {
  await Promise.all(databaseNames.splice(0).map((name) => Dexie.delete(name)))
})

describe('database migrations', () => {
  it('simplifies crew-era records without losing personalized playback or profiles', async () => {
    const name = `database-migration-${crypto.randomUUID()}`
    databaseNames.push(name)
    const versionFive = new Dexie(name)
    versionFive.version(5).stores({
      routines: '&id, name, updatedAt',
      preferences: '&id',
      contentPacks: '&id, name, updatedAt',
      participants: '&id, name, updatedAt',
      credentials: '&id',
    })
    await versionFive.table('contentPacks').add({
      id: 'pack:crew-era',
      schemaVersion: 2,
      addressingMode: 'authored',
      name: 'Still Usable',
      sayings: { general: ['Keep moving.'] },
      extensions: {},
      createdAt: 1,
      updatedAt: 1,
    })
    await versionFive.table('preferences').add({
      id: 'app',
      useOpenAiVoice: true,
      openAiFeaturesEnabled: true,
      crewProfile: { name: 'Crew' },
    })
    await versionFive.table('participants').add({
      id: 'participant:crew-era',
      name: 'Jarno Arnold',
      spokenName: 'Jarno',
      about: 'Likes kettlebells.',
      motivationStyle: 'drill-sergeant',
      avoid: 'Burpees',
      createdAt: 1,
      updatedAt: 1,
    })
    versionFive.close()

    const migrated = new WheelOfPainDatabase(name)
    const pack = await migrated.contentPacks.get('pack:crew-era')
    const preferences = await migrated.preferences.get('app')
    const participant = await migrated.participants.get('participant:crew-era')

    expect(pack).toMatchObject({
      id: 'pack:crew-era',
      schemaVersion: 1,
      addressingMode: 'authored',
      name: 'Still Usable',
    })
    expect(preferences).toMatchObject({ allowOnlineVoices: true })
    expect(preferences).not.toHaveProperty('useOpenAiVoice')
    expect(preferences).not.toHaveProperty('crewProfile')
    expect(participant).toMatchObject({
      name: 'Jarno Arnold',
      spokenName: 'Jarno',
      about: 'Likes kettlebells.',
    })
    expect(participant).not.toHaveProperty('motivationStyle')
    expect(participant).not.toHaveProperty('avoid')
    migrated.close()
  })
})
