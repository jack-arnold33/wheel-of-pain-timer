import { describe, expect, it } from 'vitest'
import type { WorkoutPhase } from '../domain/timer/types'
import type { TimerCueFrame } from './timerCues'
import { motivationCategoryBetween } from './motivationCues'

const phases: WorkoutPhase[] = [
  { id: 'prepare', kind: 'prepare', durationMs: 1_000 },
  { id: 'work-1', kind: 'work', durationMs: 1_000, cycle: 1, round: 1, exercise: 1 },
  { id: 'rest', kind: 'exerciseRest', durationMs: 1_000 },
  { id: 'work-2', kind: 'work', durationMs: 1_000, cycle: 1, round: 1, exercise: 2 },
  { id: 'cycle-rest', kind: 'cycleRest', durationMs: 1_000 },
]

const frame = (
  phaseIndex: number | undefined,
  observedAtMs: number,
  status: TimerCueFrame['status'] = 'running',
): TimerCueFrame => ({
  status,
  phaseIndex,
  remainingMs: 1_000,
  elapsedInPhaseMs: 0,
  observedAtMs,
})

describe('motivation category schedule', () => {
  it('speaks Work only for the first exercise of a round', () => {
    expect(motivationCategoryBetween(frame(0, 0), frame(1, 100), phases)).toBe('work')
    expect(motivationCategoryBetween(frame(2, 200), frame(3, 300), phases)).toBeUndefined()
  })

  it('speaks at Cycle Rest and normal completion', () => {
    expect(motivationCategoryBetween(frame(3, 0), frame(4, 100), phases)).toBe('cycleRest')
    expect(motivationCategoryBetween(frame(4, 100), frame(undefined, 200, 'complete'), phases)).toBe('finished')
  })

  it('supports a zero-Prepare workout beginning directly with Work', () => {
    expect(motivationCategoryBetween(undefined, frame(1, 0), phases)).toBe('work')
  })

  it('does not replay missed or recovered moments', () => {
    expect(motivationCategoryBetween(frame(0, 0), frame(4, 5_000), phases)).toBeUndefined()
    expect(motivationCategoryBetween(frame(1, 0, 'paused'), frame(1, 100), phases)).toBeUndefined()
  })
})

