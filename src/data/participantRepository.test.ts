import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { WheelOfPainDatabase } from './database'
import {
  InvalidParticipantNameError,
  ParticipantNameConflictError,
  ParticipantRepository,
} from './participantRepository'

let database: WheelOfPainDatabase
let repository: ParticipantRepository

beforeEach(() => {
  database = new WheelOfPainDatabase(`participant-test-${crypto.randomUUID()}`)
  let nextId = 0
  repository = new ParticipantRepository(
    database,
    () => `participant:test-${++nextId}`,
    () => 1_000 + nextId,
  )
})

afterEach(async () => database.delete())

describe('participant repository', () => {
  it('creates, renames, lists, and removes participants', async () => {
    const created = await repository.create('  Jarno  ')
    expect(created).toMatchObject({
      id: 'participant:test-1',
      name: 'Jarno',
      createdAt: 1_000,
    })
    const renamed = await repository.rename(created.id, 'J')
    expect(renamed.name).toBe('J')
    expect(await repository.list()).toEqual([renamed])
    await repository.delete(created.id)
    expect(await repository.list()).toEqual([])
  })

  it('rejects invalid and case-insensitive duplicate names', async () => {
    await expect(repository.create(' ')).rejects.toBeInstanceOf(
      InvalidParticipantNameError,
    )
    await repository.create('Jarno')
    await expect(repository.create('jarno')).rejects.toBeInstanceOf(
      ParticipantNameConflictError,
    )
  })

  it('stores and updates reusable participant profile details', async () => {
    const created = await repository.create({
      name: 'Alexandra',
      spokenName: 'Alex',
      about: 'Always chooses the heaviest kettlebell.',
      motivationStyle: 'competitive',
      avoid: 'Knee jokes',
    })

    expect(created).toMatchObject({
      spokenName: 'Alex',
      about: 'Always chooses the heaviest kettlebell.',
      motivationStyle: 'competitive',
      avoid: 'Knee jokes',
    })

    const updated = await repository.update(created.id, {
      name: 'Alexandra',
      spokenName: 'Lex',
      about: created.about,
      motivationStyle: 'playful',
      avoid: created.avoid,
    })
    expect(updated).toMatchObject({ spokenName: 'Lex', motivationStyle: 'playful' })
    expect((await repository.get(created.id))?.spokenName).toBe('Lex')
  })
})

