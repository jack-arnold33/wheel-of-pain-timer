import type { Participant, ParticipantInput } from '../domain/participants/types'
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

const normalizeOptional = (value: string | undefined, limit: number) => {
  const normalized = value?.trim() ?? ''
  if (Array.from(normalized).length > limit) {
    throw new Error(`Participant profile text exceeds the ${limit}-character limit.`)
  }
  return normalized
}

const normalizeInput = (input: ParticipantInput) => ({
  name: normalizeName(input.name),
  spokenName: normalizeOptional(input.spokenName, 80),
  about: normalizeOptional(input.about, 2_000),
})

const createParticipantId = () => `participant:${crypto.randomUUID()}`
const copyParticipant = (record: ParticipantRecord): Participant => ({
  id: record.id,
  name: record.name,
  spokenName: record.spokenName ?? '',
  about: record.about ?? '',
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
})

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

  async create(input: ParticipantInput | string): Promise<Participant> {
    const normalized = normalizeInput(
      typeof input === 'string' ? { name: input } : input,
    )
    await this.assertUnique(normalized.name)
    const timestamp = this.now()
    const record: ParticipantRecord = {
      id: this.newId(),
      ...normalized,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    await this.database.participants.add(record)
    return copyParticipant(record)
  }

  async update(id: string, input: ParticipantInput): Promise<Participant> {
    const existing = await this.database.participants.get(id)
    if (existing === undefined) throw new ParticipantNotFoundError(id)
    const normalized = normalizeInput(input)
    await this.assertUnique(normalized.name, id)
    const record = { ...existing, ...normalized, updatedAt: this.now() }
    await this.database.participants.put(record)
    return copyParticipant(record)
  }

  async rename(id: string, name: string): Promise<Participant> {
    const existing = await this.get(id)
    if (existing === undefined) throw new ParticipantNotFoundError(id)
    return this.update(id, { ...existing, name })
  }

  async delete(id: string): Promise<void> {
    if ((await this.database.participants.get(id)) === undefined) {
      throw new ParticipantNotFoundError(id)
    }
    await this.database.participants.delete(id)
  }
}

export const participantRepository = new ParticipantRepository()

