import type { WorkoutState } from '../domain/timer/types'
import { remainingPhaseMs } from '../domain/timer/engine'

export type TimerCue = { readonly kind: 'transition' }

export interface TimerCueFrame {
  readonly status: WorkoutState['status']
  readonly phaseIndex?: number
  readonly remainingMs: number
  readonly elapsedInPhaseMs: number
  readonly observedAtMs: number
}

const MAX_CONTIGUOUS_GAP_MS = 500

export function timerCueFrame(
  workout: WorkoutState,
  observedAtMs: number,
): TimerCueFrame {
  if (workout.status === 'complete') {
    return {
      status: workout.status,
      remainingMs: 0,
      elapsedInPhaseMs: 0,
      observedAtMs,
    }
  }

  return {
    status: workout.status,
    phaseIndex: workout.phaseIndex,
    remainingMs: remainingPhaseMs(workout),
    elapsedInPhaseMs: workout.elapsedInPhaseMs,
    observedAtMs,
  }
}

const TRANSITION_CUE_AT_MS = 3_000

const applicableTransitionCue = (frame: TimerCueFrame): TimerCue[] =>
  frame.remainingMs <= TRANSITION_CUE_AT_MS && frame.remainingMs > 0
    ? [{ kind: 'transition' }]
    : []

export function timerCuesBetween(
  previous: TimerCueFrame | undefined,
  current: TimerCueFrame,
): TimerCue[] {
  if (current.status !== 'running') return []
  if (previous === undefined || previous.status !== 'running') {
    return applicableTransitionCue(current)
  }

  const observationGapMs = current.observedAtMs - previous.observedAtMs
  if (observationGapMs < 0 || observationGapMs > MAX_CONTIGUOUS_GAP_MS) {
    return []
  }

  if (previous.phaseIndex !== current.phaseIndex) {
    return applicableTransitionCue(current)
  }

  return previous.remainingMs > TRANSITION_CUE_AT_MS &&
    current.remainingMs <= TRANSITION_CUE_AT_MS &&
    current.remainingMs > 0
    ? [{ kind: 'transition' }]
    : []
}
