import type { ContentPackCategory } from '../domain/contentPacks/types'
import type { WorkoutPhase } from '../domain/timer/types'
import type { TimerCueFrame } from './timerCues'

export type MotivationCategory = Exclude<ContentPackCategory, 'general'>
const MAX_CONTIGUOUS_GAP_MS = 500

export function motivationCategoryBetween(
  previous: TimerCueFrame | undefined,
  current: TimerCueFrame,
  phases: readonly WorkoutPhase[],
): MotivationCategory | undefined {
  if (current.status === 'complete') {
    if (
      previous?.status !== 'running' ||
      current.observedAtMs - previous.observedAtMs > MAX_CONTIGUOUS_GAP_MS ||
      current.observedAtMs < previous.observedAtMs
    ) {
      return undefined
    }
    return 'finished'
  }
  if (current.status !== 'running' || current.phaseIndex === undefined) {
    return undefined
  }

  const enteredPhase =
    previous === undefined ||
    (previous.status === 'running' && previous.phaseIndex !== current.phaseIndex)
  if (!enteredPhase) return undefined
  if (
    previous !== undefined &&
    (current.observedAtMs < previous.observedAtMs ||
      current.observedAtMs - previous.observedAtMs > MAX_CONTIGUOUS_GAP_MS)
  ) {
    return undefined
  }

  const phase = phases[current.phaseIndex]
  if (phase?.kind === 'cycleRest') return 'cycleRest'
  if (phase?.kind === 'work' && phase.exercise === 1) return 'work'
  return undefined
}

