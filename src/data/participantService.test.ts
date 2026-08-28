import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { WheelOfPainDatabase } from './database'
import { ParticipantRepository } from './participantRepository'
import { ParticipantService } from './participantService'
import { PreferencesRepository } from './preferencesRepository'

let database: WheelOfPainDatabase
let service: ParticipantService

beforeEach(() => {
  database = new WheelOfPainDatabase(`participant-service-${crypto.randomUUID()}`)
  service = new ParticipantService(
    database,
    new ParticipantRepository(database, () => 'participant:test', () => 1),
    new PreferencesRepository(database),
  )
})

afterEach(async () => database.delete())

describe('participant service', () => {
  it('activates a new participant and remembers attendance', async () => {
    const created = await service.createAndActivate('Jarno')
    expect(await service.load()).toEqual({
      participants: [created],
      activeIds: [created.id],
    })

    expect(await service.saveAttendance([])).toEqual([])
    expect((await service.load()).activeIds).toEqual([])
  })

  it('removes stale attendance when a participant is deleted', async () => {
    const created = await service.createAndActivate('Jarno')
    await service.remove(created.id)
    expect(await service.load()).toEqual({ participants: [], activeIds: [] })
  })
})

