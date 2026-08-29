import type { WorkoutState } from '../domain/timer/types'
import { remainingPhaseMs } from '../domain/timer/engine'

export type TimerCue =
  | { readonly kind: 'countdown'; readonly second: number }
  | { readonly kind: 'transition' }

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

const countdownSecond = (frame: TimerCueFrame) =>
  Math.ceil(frame.remainingMs / 1_000)

const applicableCountdownCue = (frame: TimerCueFrame): TimerCue[] => {
  const second = countdownSecond(frame)
  return second >= 1 && second <= 3
    ? [{ kind: 'countdown', second }]
    : []
}

export function timerCuesBetween(
  previous: TimerCueFrame | undefined,
  current: TimerCueFrame,
): TimerCue[] {
  if (current.status !== 'running') return []
  if (previous === undefined || previous.status !== 'running') {
    return applicableCountdownCue(current)
  }

  const observationGapMs = current.observedAtMs - previous.observedAtMs
  if (observationGapMs < 0 || observationGapMs > MAX_CONTIGUOUS_GAP_MS) {
    return []
  }

  if (previous.phaseIndex !== current.phaseIndex) {
    const cues: TimerCue[] = [{ kind: 'transition' }]
    return cues.concat(applicableCountdownCue(current))
  }

  const previousSecond = countdownSecond(previous)
  const currentSecond = countdownSecond(current)
  if (currentSecond !== previousSecond - 1) return []
  return applicableCountdownCue(current)
}
