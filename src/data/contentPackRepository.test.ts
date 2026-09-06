import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ContentPackDraft } from '../domain/contentPacks/types'
import { InvalidContentPackError } from '../domain/contentPacks/validation'
import { WheelOfPainDatabase } from './database'
import {
  ContentPackNameConflictError,
  ContentPackRepository,
} from './contentPackRepository'

let database: WheelOfPainDatabase
let repository: ContentPackRepository

const draft: ContentPackDraft = {
  schemaVersion: 1,
  name: 'Tuesday Chaos',
  voiceInstructions: 'Sound dry, theatrical, and encouraging.',
  sayings: { general: ['Move.'] },
  extensions: { author: 'Local' },
}

beforeEach(() => {
  database = new WheelOfPainDatabase(`content-pack-test-${crypto.randomUUID()}`)
  let nextId = 0
  repository = new ContentPackRepository(
    database,
    () => `pack:test-${++nextId}`,
    () => 1_000 + nextId,
  )
})

afterEach(async () => {
  await database.delete()
})

describe('content-pack repository', () => {
  it('creates, lists, renames, and deletes local packs', async () => {
    const created = await repository.create(draft)
    expect(created).toMatchObject({
      id: 'pack:test-1',
      name: 'Tuesday Chaos',
      createdAt: 1_000,
    })
    expect(await repository.list()).toEqual([created])

    const renamed = await repository.rename(created.id, ' Friday Fire ')
    expect(renamed.name).toBe('Friday Fire')
    expect(renamed.sayings).toEqual(draft.sayings)
    await repository.delete(created.id)
    expect(await repository.list()).toEqual([])
  })

  it('detects case-insensitive name conflicts without overwriting', async () => {
    const existing = await repository.create(draft)
    await expect(
      repository.create({ ...draft, name: 'tuesday chaos' }),
    ).rejects.toMatchObject({
      name: 'ContentPackNameConflictError',
      conflictingPack: existing,
    })
    expect(await database.contentPacks.count()).toBe(1)
  })

  it('replaces only the explicitly selected conflict target', async () => {
    const existing = await repository.create(draft)
    const replacement = await repository.replace(existing.id, {
      ...draft,
      sayings: { work: ['Again.'] },
    })

    expect(replacement.id).toBe(existing.id)
    expect(replacement.createdAt).toBe(existing.createdAt)
    expect(replacement.sayings).toEqual({ work: ['Again.'] })
    expect(await database.contentPacks.count()).toBe(1)
  })

  it('rejects a rename that conflicts with another pack', async () => {
    const first = await repository.create(draft)
    const second = await repository.create({ ...draft, name: 'Second' })

    await expect(repository.rename(second.id, first.name)).rejects.toBeInstanceOf(
      ContentPackNameConflictError,
    )
    expect((await repository.get(second.id))?.name).toBe('Second')
  })

  it('validates programmatic drafts before persistence', async () => {
    await expect(
      repository.create({ ...draft, sayings: { general: ['x'.repeat(241)] } }),
    ).rejects.toBeInstanceOf(InvalidContentPackError)
    expect(await database.contentPacks.count()).toBe(0)
  })

  it('normalizes a legacy stored pack with the default voice instructions', async () => {
    await database.contentPacks.add({
      id: 'pack:legacy',
      schemaVersion: 1,
      name: 'Legacy',
      sayings: { general: ['Move.'] },
      extensions: {},
      createdAt: 1,
      updatedAt: 1,
    })

    expect((await repository.get('pack:legacy'))?.voiceInstructions).toContain(
      'supportive workout coach',
    )
  })
})
