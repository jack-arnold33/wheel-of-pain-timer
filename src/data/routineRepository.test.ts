import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { standardRoutineTiming } from '../domain/timer/standardRoutine'
import { InvalidRoutineTimingError } from '../domain/timer/validation'
import { PROTECTED_ROUTINE_ID } from '../domain/routines/protectedRoutine'
import { WheelOfPainDatabase } from './database'
import {
  InvalidRoutineNameError,
  ProtectedRoutineMutationError,
  RoutineRepository,
} from './routineRepository'

let database: WheelOfPainDatabase
let repository: RoutineRepository

beforeEach(() => {
  database = new WheelOfPainDatabase(`routine-test-${crypto.randomUUID()}`)
  let nextId = 0
  repository = new RoutineRepository(
    database,
    () => `routine:test-${++nextId}`,
    () => 1_000 + nextId,
  )
})

afterEach(async () => {
  await database.delete()
})

describe('routine repository', () => {
  it('provides the protected preset without storing it as user data', async () => {
    const routines = await repository.list()

    expect(routines).toEqual([
      expect.objectContaining({
        id: PROTECTED_ROUTINE_ID,
        ownership: 'protected',
        name: 'Wheel of Pain',
      }),
    ])
    expect(await database.routines.count()).toBe(0)
  })

  it('creates and persists a validated user routine', async () => {
    const created = await repository.create({
      name: '  Quick Wheel  ',
      timing: { ...standardRoutineTiming, cycles: 1 },
    })

    expect(created).toMatchObject({
      id: 'routine:test-1',
      ownership: 'user',
      name: 'Quick Wheel',
      createdAt: 1_000,
      updatedAt: 1_000,
    })
    expect(await repository.get(created.id)).toEqual(created)
  })

  it('duplicates the protected preset into an editable user routine', async () => {
    const copy = await repository.duplicate(PROTECTED_ROUTINE_ID)

    expect(copy).toMatchObject({
      ownership: 'user',
      name: 'Wheel of Pain Copy',
      timing: standardRoutineTiming,
    })
    expect(await database.routines.count()).toBe(1)
  })

  it('updates and deletes only user-owned routines', async () => {
    const created = await repository.create({
      name: 'First name',
      timing: standardRoutineTiming,
    })
    const updated = await repository.update(created.id, {
      name: 'Second name',
      timing: { ...standardRoutineTiming, workSeconds: 45 },
    })

    expect(updated.name).toBe('Second name')
    expect(updated.timing.workSeconds).toBe(45)
    expect(updated.createdAt).toBe(created.createdAt)
    expect(updated.updatedAt).toBeGreaterThan(created.updatedAt)
    await repository.delete(created.id)
    expect(await repository.get(created.id)).toBeUndefined()
  })

  it('rejects protected-preset mutation', async () => {
    await expect(
      repository.update(PROTECTED_ROUTINE_ID, {
        name: 'Changed',
        timing: standardRoutineTiming,
      }),
    ).rejects.toBeInstanceOf(ProtectedRoutineMutationError)
    await expect(repository.delete(PROTECTED_ROUTINE_ID)).rejects.toBeInstanceOf(
      ProtectedRoutineMutationError,
    )
  })

  it('rejects empty names and invalid timing before persistence', async () => {
    await expect(
      repository.create({ name: '   ', timing: standardRoutineTiming }),
    ).rejects.toBeInstanceOf(InvalidRoutineNameError)
    await expect(
      repository.create({
        name: 'Invalid',
        timing: { ...standardRoutineTiming, workSeconds: 0 },
      }),
    ).rejects.toBeInstanceOf(InvalidRoutineTimingError)
    expect(await database.routines.count()).toBe(0)
  })
})
