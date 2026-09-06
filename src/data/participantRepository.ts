import type { Participant } from '../domain/participants/types'
import {
  appDatabase,
  type ParticipantRecord,
  type WheelOfPainDatabase,
} from './database'

export class InvalidParticipantNameError extends Error {
  constructor() {
    super('Participant name must contain 1 through 80 characters.')
    this.name = 'InvalidParticipantNameError'
  }
}

export class ParticipantNameConflictError extends Error {
  constructor(name: string) {
    super(`A participant named ${name} already exists.`)
    this.name = 'ParticipantNameConflictError'
  }
}

export class ParticipantNotFoundError extends Error {
  constructor(id: string) {
    super(`Participant was not found: ${id}`)
    this.name = 'ParticipantNotFoundError'
  }
}

const normalizeName = (name: string) => {
  const normalized = name.trim()
  const length = Array.from(normalized).length
  if (length < 1 || length > 80) throw new InvalidParticipantNameError()
  return normalized
}

const createParticipantId = () => `participant:${crypto.randomUUID()}`
const copyParticipant = (record: ParticipantRecord): Participant => ({ ...record })

export class ParticipantRepository {
  constructor(
    private readonly database: WheelOfPainDatabase = appDatabase,
    private readonly newId: () => string = createParticipantId,
    private readonly now: () => number = Date.now,
  ) {}

  async list(): Promise<readonly Participant[]> {
    return (await this.database.participants.orderBy('name').toArray()).map(
      copyParticipant,
    )
  }

  async get(id: string): Promise<Participant | undefined> {
    const record = await this.database.participants.get(id)
    return record === undefined ? undefined : copyParticipant(record)
  }

  private async assertUnique(name: string, exceptId?: string) {
    const key = name.toLocaleLowerCase()
    const conflict = (await this.database.participants.toArray()).some(
      (entry) =>
        entry.id !== exceptId && entry.name.toLocaleLowerCase() === key,
    )
    if (conflict) throw new ParticipantNameConflictError(name)
  }

  async create(name: string): Promise<Participant> {
    const normalized = normalizeName(name)
    await this.assertUnique(normalized)
    const timestamp = this.now()
    const record: ParticipantRecord = {
      id: this.newId(),
      name: normalized,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    await this.database.participants.add(record)
    return copyParticipant(record)
  }

  async rename(id: string, name: string): Promise<Participant> {
    const existing = await this.database.participants.get(id)
    if (existing === undefined) throw new ParticipantNotFoundError(id)
    const normalized = normalizeName(name)
    await this.assertUnique(normalized, id)
    const record = { ...existing, name: normalized, updatedAt: this.now() }
    await this.database.participants.put(record)
    return copyParticipant(record)
  }

  async delete(id: string): Promise<void> {
    if ((await this.database.participants.get(id)) === undefined) {
      throw new ParticipantNotFoundError(id)
    }
    await this.database.participants.delete(id)
  }
}

export const participantRepository = new ParticipantRepository()

