import { describe, expect, it } from 'vitest'
import { buildWorkoutSequence } from './sequence'
import { standardRoutineTiming } from './standardRoutine'

describe('buildWorkoutSequence', () => {
  it('builds the exact standard Wheel of Pain nesting (R-002, R-006, T-009)', () => {
    const phases = buildWorkoutSequence(standardRoutineTiming)

    expect(phases).toHaveLength(96)
    expect(phases.filter(({ kind }) => kind === 'prepare')).toHaveLength(1)
    expect(phases.filter(({ kind }) => kind === 'work')).toHaveLength(48)
    expect(
      phases.filter(({ kind }) => kind === 'exerciseRest'),
    ).toHaveLength(44)
    expect(phases.filter(({ kind }) => kind === 'cycleRest')).toHaveLength(3)
    expect(phases.filter(({ kind }) => kind === 'cooldown')).toHaveLength(0)

    const workPhases = phases.filter(({ kind }) => kind === 'work')
    expect(workPhases[0]).toMatchObject({
      cycle: 1,
      round: 1,
      exercise: 1,
      workInterval: 1,
    })
    expect(workPhases.at(-1)).toMatchObject({
      cycle: 4,
      round: 4,
      exercise: 3,
      workInterval: 48,
    })
    expect(phases.reduce((sum, phase) => sum + phase.durationMs, 0)).toBe(
      2_470_000,
    )
  })

  it('omits every zero-duration optional phase (R-009)', () => {
    const phases = buildWorkoutSequence({
      ...standardRoutineTiming,
      prepareSeconds: 0,
      exerciseRestSeconds: 0,
      cycleRestSeconds: 0,
      cooldownSeconds: 0,
    })

    expect(phases).toHaveLength(48)
    expect(new Set(phases.map(({ kind }) => kind))).toEqual(new Set(['work']))
  })

  it('uses Cycle Rest instead of Exercise Rest after a non-final cycle', () => {
    const phases = buildWorkoutSequence({
      prepareSeconds: 0,
      workSeconds: 10,
      exerciseRestSeconds: 5,
      exercisesPerRound: 2,
      roundsPerCycle: 1,
      cycles: 2,
      cycleRestSeconds: 20,
      cooldownSeconds: 0,
    })

    expect(phases.map(({ kind }) => kind)).toEqual([
      'work',
      'exerciseRest',
      'work',
      'cycleRest',
      'work',
      'exerciseRest',
      'work',
    ])
  })
})
