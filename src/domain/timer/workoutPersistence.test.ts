import { afterEach, describe, expect, it } from 'vitest'
import type { WorkoutPhase, WorkoutState } from './types'
import {
  clearWorkoutCheckpoint,
  restoreWorkoutCheckpoint,
  saveWorkoutCheckpoint,
} from './workoutPersistence'

const phases: readonly WorkoutPhase[] = [
  { id: 'prepare', kind: 'prepare', durationMs: 10_000 },
  { id: 'work', kind: 'work', durationMs: 10_000 },
]

afterEach(() => clearWorkoutCheckpoint())

describe('workout checkpoint recovery', () => {
  it('advances a running workout once using wall-clock elapsed time', () => {
    const running: WorkoutState = {
      status: 'running',
      phases,
      phaseIndex: 0,
      elapsedInPhaseMs: 2_000,
      monotonicAnchorMs: 50,
    }
    saveWorkoutCheckpoint('standard', running, 2_000, 1_000)

    const restored = restoreWorkoutCheckpoint('standard', phases, 13_000, 500)

    expect(restored?.workout).toMatchObject({
      status: 'running',
      phaseIndex: 1,
      elapsedInPhaseMs: 4_000,
      monotonicAnchorMs: 500,
    })
    expect(restored?.activeElapsedMs).toBe(14_000)
    expect(restored?.accuracyWarning).toBe(false)
  })

  it('restores a paused workout without adding closed time', () => {
    const paused: WorkoutState = {
      status: 'paused',
      phases,
      phaseIndex: 1,
      elapsedInPhaseMs: 3_000,
    }
    saveWorkoutCheckpoint('standard', paused, 8_000, 1_000)

    const restored = restoreWorkoutCheckpoint('standard', phases, 50_000, 500)

    expect(restored?.workout).toEqual(paused)
    expect(restored?.activeElapsedMs).toBe(8_000)
  })

  it('stores an interrupted resume countdown as paused', () => {
    const resuming: WorkoutState = {
      status: 'resuming',
      phases,
      phaseIndex: 0,
      elapsedInPhaseMs: 4_000,
      countdownStartedAtMs: 100,
      countdownDurationMs: 3_000,
    }
    saveWorkoutCheckpoint('standard', resuming, 4_000, 1_000)

    expect(
      restoreWorkoutCheckpoint('standard', phases, 20_000, 500)?.workout,
    ).toMatchObject({
      status: 'paused',
      phaseIndex: 0,
      elapsedInPhaseMs: 4_000,
    })
  })

  it('fails safe as paused after a backward clock change', () => {
    const running: WorkoutState = {
      status: 'running',
      phases,
      phaseIndex: 0,
      elapsedInPhaseMs: 2_000,
      monotonicAnchorMs: 50,
    }
    saveWorkoutCheckpoint('standard', running, 2_000, 10_000)

    const restored = restoreWorkoutCheckpoint('standard', phases, 9_000, 500)

    expect(restored?.workout.status).toBe('paused')
    expect(restored?.accuracyWarning).toBe(true)
    expect(restored?.notice).toContain('accuracy could not be verified')
  })

  it('restores completion after the saved timeline finishes', () => {
    const running: WorkoutState = {
      status: 'running',
      phases,
      phaseIndex: 1,
      elapsedInPhaseMs: 9_000,
      monotonicAnchorMs: 50,
    }
    saveWorkoutCheckpoint('standard', running, 19_000, 1_000)

    const restored = restoreWorkoutCheckpoint('standard', phases, 5_000, 500)

    expect(restored?.workout.status).toBe('complete')
    expect(restored?.activeElapsedMs).toBe(20_000)
  })
})
