export type PhaseKind =
  | 'prepare'
  | 'work'
  | 'exerciseRest'
  | 'cycleRest'
  | 'cooldown'

export interface RoutineTiming {
  prepareSeconds: number
  workSeconds: number
  exerciseRestSeconds: number
  exercisesPerRound: number
  roundsPerCycle: number
  cycles: number
  cycleRestSeconds: number
  cooldownSeconds: number
}

export interface WorkoutPhase {
  id: string
  kind: PhaseKind
  durationMs: number
  cycle?: number
  round?: number
  exercise?: number
  workInterval?: number
}

interface PositionedWorkout {
  readonly phases: readonly WorkoutPhase[]
  readonly phaseIndex: number
  readonly elapsedInPhaseMs: number
}

export interface RunningWorkout extends PositionedWorkout {
  readonly status: 'running'
  readonly monotonicAnchorMs: number
}

export interface PausedWorkout extends PositionedWorkout {
  readonly status: 'paused'
}

export interface ResumingWorkout extends PositionedWorkout {
  readonly status: 'resuming'
  readonly countdownStartedAtMs: number
  readonly countdownDurationMs: number
}

export interface CompleteWorkout {
  readonly status: 'complete'
  readonly phases: readonly WorkoutPhase[]
}

export type WorkoutState =
  | RunningWorkout
  | PausedWorkout
  | ResumingWorkout
  | CompleteWorkout
