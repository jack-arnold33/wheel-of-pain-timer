import { describe, expect, it } from 'vitest'
import { startWorkout } from '../domain/timer/engine'
import { buildWorkoutSequence } from '../domain/timer/sequence'
import { standardRoutineTiming } from '../domain/timer/standardRoutine'
import {
  formatClock,
  nextPhase,
  phaseLabel,
  phasePositionLines,
  workIntervalsRemaining,
} from './timerPresentation'

describe('timer presentation', () => {
  const phases = buildWorkoutSequence(standardRoutineTiming)

  it('formats remaining time with ceiling behavior', () => {
    expect(formatClock(30_000)).toBe('00:30')
    expect(formatClock(1)).toBe('00:01')
    expect(formatClock(0)).toBe('00:00')
    expect(formatClock(3_661_000)).toBe('1:01:01')
  })

  it('uses the accepted user-facing phase labels', () => {
    expect(phaseLabel('exerciseRest')).toBe('Rest')
    expect(phaseLabel('cycleRest')).toBe('Cycle Rest')
  })

  it('excludes the current work interval from the remaining count', () => {
    const initial = startWorkout(phases, 0)
    expect(workIntervalsRemaining(initial)).toBe(48)

    const firstWork = { ...initial, phaseIndex: 1 }
    expect(workIntervalsRemaining(firstWork)).toBe(47)
  })

  it('presents position and next-phase context', () => {
    const firstWork = phases[1]
    expect(firstWork).toBeDefined()
    if (firstWork === undefined) return

    expect(phasePositionLines(firstWork, standardRoutineTiming)).toEqual([
      'Exercise 1 of 3',
      'Round 1 of 4',
      'Cycle 1 of 4',
    ])
    expect(nextPhase(phases, 1)?.kind).toBe('exerciseRest')
  })
})
