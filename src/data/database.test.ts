import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { WheelOfPainDatabase } from './database'

const databaseNames: string[] = []

afterEach(async () => {
  await Promise.all(databaseNames.splice(0).map((name) => Dexie.delete(name)))
})

describe('database migrations', () => {
  it('rolls crew-personality records back without losing packs or OpenAI voice selection', async () => {
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
      addressingMode: 'participant-prefix',
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
    versionFive.close()

    const migrated = new WheelOfPainDatabase(name)
    const pack = await migrated.contentPacks.get('pack:crew-era')
    const preferences = await migrated.preferences.get('app')

    expect(pack).toMatchObject({
      id: 'pack:crew-era',
      schemaVersion: 1,
      name: 'Still Usable',
    })
    expect(pack).not.toHaveProperty('addressingMode')
    expect(preferences).toMatchObject({ allowOnlineVoices: true })
    expect(preferences).not.toHaveProperty('useOpenAiVoice')
    expect(preferences).not.toHaveProperty('crewProfile')
    migrated.close()
  })
})
