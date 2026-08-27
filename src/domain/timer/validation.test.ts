import { describe, expect, it } from 'vitest'
import { standardRoutineTiming } from './standardRoutine'
import {
  calculateScheduledSeconds,
  calculateWorkIntervals,
  validateRoutineTiming,
} from './validation'

describe('routine timing validation', () => {
  it('calculates standard totals used by pre-workout review (R-010)', () => {
    expect(calculateWorkIntervals(standardRoutineTiming)).toBe(48)
    expect(calculateScheduledSeconds(standardRoutineTiming)).toBe(2_470)
    expect(validateRoutineTiming(standardRoutineTiming)).toEqual([])
  })

  it('allows zero optional durations but requires positive Work and counts (R-009)', () => {
    const issues = validateRoutineTiming({
      ...standardRoutineTiming,
      prepareSeconds: 0,
      exerciseRestSeconds: 0,
      cycleRestSeconds: 0,
      cooldownSeconds: 0,
      workSeconds: 0,
      exercisesPerRound: 0,
    })

    expect(issues.map(({ field }) => field)).toEqual([
      'workSeconds',
      'exercisesPerRound',
    ])
  })

  it('enforces field and aggregate limits (R-010)', () => {
    const issues = validateRoutineTiming({
      prepareSeconds: 3_600,
      workSeconds: 3_599,
      exerciseRestSeconds: 3_600,
      exercisesPerRound: 99,
      roundsPerCycle: 99,
      cycles: 2,
      cycleRestSeconds: 3_600,
      cooldownSeconds: 3_600,
    })

    expect(issues.map(({ field }) => field)).toEqual([
      'prepareSeconds',
      'exerciseRestSeconds',
      'cycleRestSeconds',
      'cooldownSeconds',
      'workIntervals',
      'scheduledSeconds',
    ])
  })
})
