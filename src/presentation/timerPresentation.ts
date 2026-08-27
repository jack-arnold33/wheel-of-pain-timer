import type { PhaseKind, RoutineTiming, WorkoutPhase, WorkoutState } from '../domain/timer/types'

const phaseLabels: Record<PhaseKind, string> = {
  prepare: 'Prepare',
  work: 'Work',
  exerciseRest: 'Rest',
  cycleRest: 'Cycle Rest',
  cooldown: 'Cooldown',
}

export function phaseLabel(kind: PhaseKind): string {
  return phaseLabels[kind]
}

export function formatClock(milliseconds: number): string {
  const totalSeconds = Math.ceil(Math.max(0, milliseconds) / 1_000)
  const hours = Math.floor(totalSeconds / 3_600)
  const minutes = Math.floor((totalSeconds % 3_600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return [hours, minutes, seconds]
      .map((value, index) => index === 0 ? String(value) : String(value).padStart(2, '0'))
      .join(':')
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function nextPhase(phases: readonly WorkoutPhase[], phaseIndex: number): WorkoutPhase | undefined {
  return phases[phaseIndex + 1]
}

export function workIntervalsRemaining(state: WorkoutState): number {
  if (state.status === 'complete') return 0
  return state.phases
    .slice(state.phaseIndex + 1)
    .filter(({ kind }) => kind === 'work').length
}

export function phasePosition(
  phase: WorkoutPhase,
  timing: RoutineTiming,
): string {
  const parts: string[] = []
  if (phase.cycle !== undefined) parts.push(`Cycle ${phase.cycle} of ${timing.cycles}`)
  if (phase.round !== undefined) parts.push(`Round ${phase.round} of ${timing.roundsPerCycle}`)
  if (phase.exercise !== undefined) parts.push(`Exercise ${phase.exercise} of ${timing.exercisesPerRound}`)
  return parts.join(' · ')
}

export function remainingScheduledMs(state: WorkoutState): number {
  if (state.status === 'complete') return 0
  const current = state.phases[state.phaseIndex]
  if (current === undefined) return 0
  const currentRemaining = Math.max(0, current.durationMs - state.elapsedInPhaseMs)
  return currentRemaining + state.phases
    .slice(state.phaseIndex + 1)
    .reduce((total, phase) => total + phase.durationMs, 0)
}
