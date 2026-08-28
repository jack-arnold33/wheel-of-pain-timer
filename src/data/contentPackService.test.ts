import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ContentPackDraft } from '../domain/contentPacks/types'
import { ContentPackRepository } from './contentPackRepository'
import { ContentPackService } from './contentPackService'
import { WheelOfPainDatabase } from './database'
import { PreferencesRepository } from './preferencesRepository'

let database: WheelOfPainDatabase
let service: ContentPackService

const draft: ContentPackDraft = {
  schemaVersion: 1,
  name: 'Local Pack',
  sayings: { general: ['Keep moving.'] },
  extensions: {},
}

beforeEach(() => {
  database = new WheelOfPainDatabase(`content-pack-service-${crypto.randomUUID()}`)
  const packs = new ContentPackRepository(database, () => 'pack:local', () => 100)
  const preferences = new PreferencesRepository(database)
  service = new ContentPackService(database, packs, preferences)
})

afterEach(async () => {
  await database.delete()
})

describe('content-pack selection service', () => {
  it('saves and selects an imported pack in one local transaction', async () => {
    const saved = await service.importAndSelect(draft)
    const state = await service.load()

    expect(state.packs).toEqual([saved])
    expect(state.preferences.selectedContentPackId).toBe(saved.id)
  })

  it('removes a selected pack and returns Personality to None', async () => {
    const saved = await service.importAndSelect(draft)
    await service.remove(saved.id, true)
    const state = await service.load()

    expect(state.packs).toEqual([])
    expect(state.preferences.selectedContentPackId).toBeNull()
  })
})

