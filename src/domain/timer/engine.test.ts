import { describe, expect, it } from 'vitest'
import {
  beginResumeCountdown,
  currentPhase,
  pauseWorkout,
  projectWorkout,
  remainingPhaseMs,
  resumeCountdownRemainingMs,
  skipPhase,
  startWorkout,
} from './engine'
import type { WorkoutPhase } from './types'

const phases: WorkoutPhase[] = [
  { id: 'prepare', kind: 'prepare', durationMs: 10_000 },
  { id: 'work-1', kind: 'work', durationMs: 30_000, workInterval: 1 },
  { id: 'rest-1', kind: 'exerciseRest', durationMs: 15_000 },
  { id: 'work-2', kind: 'work', durationMs: 30_000, workInterval: 2 },
]

describe('timer engine', () => {
  it('projects from monotonic elapsed time across delayed callbacks (T-004)', () => {
    const started = startWorkout(phases, 1_000)
    const projected = projectWorkout(started, 52_000)

    expect(projected.status).toBe('running')
    expect(currentPhase(projected)?.id).toBe('rest-1')
    expect(remainingPhaseMs(projected)).toBe(4_000)
  })

  it('moves at the exact boundary without lingering at zero (T-011)', () => {
    const projected = projectWorkout(startWorkout(phases, 0), 10_000)

    expect(currentPhase(projected)?.id).toBe('work-1')
    expect(remainingPhaseMs(projected)).toBe(30_000)
  })

  it('freezes elapsed phase time while paused (T-003, T-004)', () => {
    const paused = pauseWorkout(startWorkout(phases, 0), 4_250)
    const later = projectWorkout(paused, 99_000)

    expect(later.status).toBe('paused')
    expect(currentPhase(later)?.id).toBe('prepare')
    expect(remainingPhaseMs(later)).toBe(5_750)
  })

  it('runs a three-second resume countdown without consuming phase time (T-003)', () => {
    const paused = pauseWorkout(startWorkout(phases, 0), 4_000)
    const resuming = beginResumeCountdown(paused, 10_000)

    expect(resumeCountdownRemainingMs(resuming, 11_200)).toBe(1_800)
    expect(remainingPhaseMs(resuming)).toBe(6_000)

    const resumed = projectWorkout(resuming, 13_000)
    expect(resumed.status).toBe('running')
    expect(remainingPhaseMs(resumed)).toBe(6_000)
  })

  it('cancels a resume countdown back to the same paused position (T-014)', () => {
    const paused = pauseWorkout(startWorkout(phases, 0), 4_000)
    const resuming = beginResumeCountdown(paused, 10_000)
    const canceled = pauseWorkout(resuming, 11_000)

    expect(canceled.status).toBe('paused')
    expect(currentPhase(canceled)?.id).toBe('prepare')
    expect(remainingPhaseMs(canceled)).toBe(6_000)
  })

  it('skips immediately when running and preserves pause otherwise (T-003)', () => {
    const runningSkip = skipPhase(startWorkout(phases, 0), 2_000)
    expect(runningSkip.status).toBe('running')
    expect(currentPhase(runningSkip)?.id).toBe('work-1')
    expect(remainingPhaseMs(runningSkip)).toBe(30_000)

    const paused = pauseWorkout(startWorkout(phases, 0), 2_000)
    const pausedSkip = skipPhase(paused, 20_000)
    expect(pausedSkip.status).toBe('paused')
    expect(currentPhase(pausedSkip)?.id).toBe('work-1')

    const resuming = beginResumeCountdown(paused, 5_000)
    const resumeSkip = skipPhase(resuming, 6_000)
    expect(resumeSkip.status).toBe('paused')
    expect(currentPhase(resumeSkip)?.id).toBe('work-1')
  })

  it('enters Complete after the final phase', () => {
    const projected = projectWorkout(startWorkout(phases, 0), 85_000)
    expect(projected.status).toBe('complete')
    expect(currentPhase(projected)).toBeUndefined()
  })
})
