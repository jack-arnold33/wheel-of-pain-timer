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
const MIN_USEFUL_TRANSITION_CUE_REMAINING_MS = 1_000

const applicableTransitionCue = (frame: TimerCueFrame): TimerCue[] =>
  frame.remainingMs <= TRANSITION_CUE_AT_MS && frame.remainingMs > 0
    && frame.remainingMs >= MIN_USEFUL_TRANSITION_CUE_REMAINING_MS
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

  if (current.observedAtMs < previous.observedAtMs) return []

  if (previous.phaseIndex !== current.phaseIndex) {
    return applicableTransitionCue(current)
  }

  return previous.remainingMs > TRANSITION_CUE_AT_MS &&
    current.remainingMs <= TRANSITION_CUE_AT_MS &&
    current.remainingMs > 0
    ? applicableTransitionCue(current)
    : []
}

export class TimerCueScheduler {
  private previous?: TimerCueFrame
  private readonly cuedPhaseIndexes = new Set<number>()

  constructor(initialFrame?: TimerCueFrame) {
    this.previous = initialFrame
  }

  cuesAt(current: TimerCueFrame): TimerCue[] {
    const cues = timerCuesBetween(this.previous, current)
    this.previous = current

    if (cues.length === 0 || current.phaseIndex === undefined) return []
    if (this.cuedPhaseIndexes.has(current.phaseIndex)) return []

    this.cuedPhaseIndexes.add(current.phaseIndex)
    return cues
  }
}
