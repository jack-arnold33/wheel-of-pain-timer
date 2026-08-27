import type {
  CompleteWorkout,
  PausedWorkout,
  RunningWorkout,
  WorkoutPhase,
  WorkoutState,
} from './types'

const DEFAULT_RESUME_COUNTDOWN_MS = 3_000

const complete = (phases: readonly WorkoutPhase[]): CompleteWorkout => ({
  status: 'complete',
  phases,
})

function advanceBy(
  phases: readonly WorkoutPhase[],
  startIndex: number,
  startElapsedMs: number,
  deltaMs: number,
): { phaseIndex: number; elapsedInPhaseMs: number } | null {
  let phaseIndex = startIndex
  let elapsedInPhaseMs = startElapsedMs + Math.max(0, deltaMs)

  while (phaseIndex < phases.length) {
    const phase = phases[phaseIndex]
    if (phase === undefined) return null
    if (elapsedInPhaseMs < phase.durationMs) {
      return { phaseIndex, elapsedInPhaseMs }
    }
    elapsedInPhaseMs -= phase.durationMs
    phaseIndex += 1
  }

  return null
}

export function startWorkout(
  phases: readonly WorkoutPhase[],
  nowMs: number,
): WorkoutState {
  if (phases.length === 0) return complete(phases)

  return {
    status: 'running',
    phases,
    phaseIndex: 0,
    elapsedInPhaseMs: 0,
    monotonicAnchorMs: nowMs,
  }
}

export function projectWorkout(
  state: WorkoutState,
  nowMs: number,
): WorkoutState {
  if (state.status === 'complete' || state.status === 'paused') return state

  if (state.status === 'resuming') {
    const countdownElapsedMs = Math.max(
      0,
      nowMs - state.countdownStartedAtMs,
    )
    if (countdownElapsedMs < state.countdownDurationMs) return state

    const running: RunningWorkout = {
      status: 'running',
      phases: state.phases,
      phaseIndex: state.phaseIndex,
      elapsedInPhaseMs: state.elapsedInPhaseMs,
      monotonicAnchorMs:
        state.countdownStartedAtMs + state.countdownDurationMs,
    }
    return projectWorkout(running, nowMs)
  }

  const projected = advanceBy(
    state.phases,
    state.phaseIndex,
    state.elapsedInPhaseMs,
    nowMs - state.monotonicAnchorMs,
  )
  if (projected === null) return complete(state.phases)

  return {
    status: 'running',
    phases: state.phases,
    ...projected,
    monotonicAnchorMs: nowMs,
  }
}

export function pauseWorkout(
  state: WorkoutState,
  nowMs: number,
): WorkoutState {
  if (state.status === 'complete' || state.status === 'paused') return state
  if (state.status === 'resuming') {
    return {
      status: 'paused',
      phases: state.phases,
      phaseIndex: state.phaseIndex,
      elapsedInPhaseMs: state.elapsedInPhaseMs,
    }
  }

  const projected = projectWorkout(state, nowMs)
  if (projected.status !== 'running') return projected

  return {
    status: 'paused',
    phases: projected.phases,
    phaseIndex: projected.phaseIndex,
    elapsedInPhaseMs: projected.elapsedInPhaseMs,
  }
}

export function beginResumeCountdown(
  state: WorkoutState,
  nowMs: number,
  countdownDurationMs = DEFAULT_RESUME_COUNTDOWN_MS,
): WorkoutState {
  if (state.status !== 'paused') return state

  return {
    status: 'resuming',
    phases: state.phases,
    phaseIndex: state.phaseIndex,
    elapsedInPhaseMs: state.elapsedInPhaseMs,
    countdownStartedAtMs: nowMs,
    countdownDurationMs,
  }
}

export function skipPhase(
  state: WorkoutState,
  nowMs: number,
): WorkoutState {
  const current =
    state.status === 'running' ? projectWorkout(state, nowMs) : state
  if (current.status === 'complete') return current

  const nextIndex = current.phaseIndex + 1
  if (nextIndex >= current.phases.length) return complete(current.phases)

  if (current.status === 'running') {
    return {
      status: 'running',
      phases: current.phases,
      phaseIndex: nextIndex,
      elapsedInPhaseMs: 0,
      monotonicAnchorMs: nowMs,
    }
  }

  const paused: PausedWorkout = {
    status: 'paused',
    phases: current.phases,
    phaseIndex: nextIndex,
    elapsedInPhaseMs: 0,
  }
  return paused
}

export function currentPhase(state: WorkoutState): WorkoutPhase | undefined {
  if (state.status === 'complete') return undefined
  return state.phases[state.phaseIndex]
}

export function remainingPhaseMs(state: WorkoutState): number {
  const phase = currentPhase(state)
  if (phase === undefined || state.status === 'complete') return 0
  return Math.max(0, phase.durationMs - state.elapsedInPhaseMs)
}

export function resumeCountdownRemainingMs(
  state: WorkoutState,
  nowMs: number,
): number {
  if (state.status !== 'resuming') return 0
  return Math.max(
    0,
    state.countdownDurationMs - (nowMs - state.countdownStartedAtMs),
  )
}
