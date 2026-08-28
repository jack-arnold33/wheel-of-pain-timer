import { assertValidRoutineTiming } from '../domain/timer/validation'
import {
  PROTECTED_ROUTINE_ID,
  protectedStandardRoutine,
} from '../domain/routines/protectedRoutine'
import type { Routine, RoutineInput, UserRoutine } from '../domain/routines/types'
import {
  appDatabase,
  type UserRoutineRecord,
  type WheelOfPainDatabase,
} from './database'

export class InvalidRoutineNameError extends Error {
  constructor() {
    super('Routine name must not be empty.')
    this.name = 'InvalidRoutineNameError'
  }
}

export class ProtectedRoutineMutationError extends Error {
  constructor() {
    super('The protected Wheel of Pain preset cannot be changed or deleted.')
    this.name = 'ProtectedRoutineMutationError'
  }
}

export class RoutineNotFoundError extends Error {
  constructor(id: string) {
    super(`Routine was not found: ${id}`)
    this.name = 'RoutineNotFoundError'
  }
}

const normalizeName = (name: string) => {
  const normalized = name.trim()
  if (normalized.length === 0) throw new InvalidRoutineNameError()
  return normalized
}

const copyTiming = (timing: RoutineInput['timing']) => ({ ...timing })

const toUserRoutine = (record: UserRoutineRecord): UserRoutine => ({
  ...record,
  timing: copyTiming(record.timing),
  ownership: 'user',
})

const protectedRoutineCopy = (): Routine => ({
  ...protectedStandardRoutine,
  timing: copyTiming(protectedStandardRoutine.timing),
})

const createRoutineId = () => `routine:${crypto.randomUUID()}`

export class RoutineRepository {
  constructor(
    private readonly database: WheelOfPainDatabase = appDatabase,
    private readonly newId: () => string = createRoutineId,
    private readonly now: () => number = Date.now,
  ) {}

  async list(): Promise<readonly Routine[]> {
    const records = await this.database.routines.orderBy('name').toArray()
    return [protectedRoutineCopy(), ...records.map(toUserRoutine)]
  }

  async get(id: string): Promise<Routine | undefined> {
    if (id === PROTECTED_ROUTINE_ID) return protectedRoutineCopy()
    const record = await this.database.routines.get(id)
    return record === undefined ? undefined : toUserRoutine(record)
  }

  async create(input: RoutineInput): Promise<UserRoutine> {
    assertValidRoutineTiming(input.timing)
    const timestamp = this.now()
    const record: UserRoutineRecord = {
      id: this.newId(),
      name: normalizeName(input.name),
      timing: copyTiming(input.timing),
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    await this.database.routines.add(record)
    return toUserRoutine(record)
  }

  async update(id: string, input: RoutineInput): Promise<UserRoutine> {
    if (id === PROTECTED_ROUTINE_ID) throw new ProtectedRoutineMutationError()
    assertValidRoutineTiming(input.timing)
    const existing = await this.database.routines.get(id)
    if (existing === undefined) throw new RoutineNotFoundError(id)

    const updated: UserRoutineRecord = {
      ...existing,
      name: normalizeName(input.name),
      timing: copyTiming(input.timing),
      updatedAt: this.now(),
    }
    await this.database.routines.put(updated)
    return toUserRoutine(updated)
  }

  async duplicate(id: string, name?: string): Promise<UserRoutine> {
    const source = await this.get(id)
    if (source === undefined) throw new RoutineNotFoundError(id)
    return this.create({
      name: name ?? `${source.name} Copy`,
      timing: source.timing,
    })
  }

  async delete(id: string): Promise<void> {
    if (id === PROTECTED_ROUTINE_ID) throw new ProtectedRoutineMutationError()
    const existing = await this.database.routines.get(id)
    if (existing === undefined) throw new RoutineNotFoundError(id)
    await this.database.routines.delete(id)
  }
}

export const routineRepository = new RoutineRepository()
