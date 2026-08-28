import { projectWorkout } from './engine'
import type { WorkoutPhase, WorkoutState } from './types'

const CHECKPOINT_KEY = 'wheel-of-pain.active-workout.v1'

interface StoredCheckpoint {
  readonly schemaVersion: 1
  readonly routineId: string
  readonly status: 'running' | 'paused' | 'complete'
  readonly phaseIndex?: number
  readonly elapsedInPhaseMs?: number
  readonly wallClockMs: number
  readonly activeElapsedMs: number
}

export interface RestoredWorkout {
  readonly workout: WorkoutState
  readonly activeElapsedMs: number
  readonly notice: string
  readonly accuracyWarning: boolean
}

function browserStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}

const isNonNegativeFinite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0

function isStoredCheckpoint(value: unknown): value is StoredCheckpoint {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<StoredCheckpoint>
  if (
    candidate.schemaVersion !== 1 ||
    typeof candidate.routineId !== 'string' ||
    !['running', 'paused', 'complete'].includes(candidate.status ?? '') ||
    !isNonNegativeFinite(candidate.wallClockMs) ||
    !isNonNegativeFinite(candidate.activeElapsedMs)
  ) {
    return false
  }
  if (candidate.status === 'complete') return true
  return (
    Number.isInteger(candidate.phaseIndex) &&
    isNonNegativeFinite(candidate.phaseIndex) &&
    isNonNegativeFinite(candidate.elapsedInPhaseMs)
  )
}

function remainingScheduledMs(
  phases: readonly WorkoutPhase[],
  phaseIndex: number,
  elapsedInPhaseMs: number,
) {
  return phases.slice(phaseIndex).reduce(
    (total, phase, index) =>
      total + Math.max(0, phase.durationMs - (index === 0 ? elapsedInPhaseMs : 0)),
    0,
  )
}

export function saveWorkoutCheckpoint(
  routineId: string,
  workout: WorkoutState,
  activeElapsedMs: number,
  wallClockMs = Date.now(),
  storage = browserStorage(),
) {
  if (storage === undefined) return

  const checkpoint: StoredCheckpoint = workout.status === 'complete'
    ? {
        schemaVersion: 1,
        routineId,
        status: 'complete',
        wallClockMs,
        activeElapsedMs,
      }
    : {
        schemaVersion: 1,
        routineId,
        status: workout.status === 'running' ? 'running' : 'paused',
        phaseIndex: workout.phaseIndex,
        elapsedInPhaseMs: workout.elapsedInPhaseMs,
        wallClockMs,
        activeElapsedMs,
      }

  try {
    storage.setItem(CHECKPOINT_KEY, JSON.stringify(checkpoint))
  } catch {
    // Storage failure must never interrupt the timer.
  }
}

export function clearWorkoutCheckpoint(storage = browserStorage()) {
  try {
    storage?.removeItem(CHECKPOINT_KEY)
  } catch {
    // The app remains usable when browser storage is unavailable.
  }
}

function readStoredCheckpoint(
  storage: Storage | undefined,
): StoredCheckpoint | undefined {
  if (storage === undefined) return undefined
  try {
    const serialized = storage.getItem(CHECKPOINT_KEY)
    if (serialized === null) return undefined
    const parsed: unknown = JSON.parse(serialized)
    if (!isStoredCheckpoint(parsed)) {
      clearWorkoutCheckpoint(storage)
      return undefined
    }
    return parsed
  } catch {
    clearWorkoutCheckpoint(storage)
    return undefined
  }
}

export function readWorkoutCheckpointRoutineId(
  storage = browserStorage(),
): string | undefined {
  return readStoredCheckpoint(storage)?.routineId
}

export function restoreWorkoutCheckpoint(
  routineId: string,
  phases: readonly WorkoutPhase[],
  wallClockMs = Date.now(),
  monotonicNowMs = performance.now(),
  storage = browserStorage(),
): RestoredWorkout | undefined {
  const checkpoint = readStoredCheckpoint(storage)
  if (checkpoint === undefined) return undefined
  if (checkpoint.routineId !== routineId) {
    clearWorkoutCheckpoint(storage)
    return undefined
  }

  const restoredNotice = 'Workout restored after an interruption.'
  if (checkpoint.status === 'complete') {
    return {
      workout: { status: 'complete', phases },
      activeElapsedMs: checkpoint.activeElapsedMs,
      notice: restoredNotice,
      accuracyWarning: false,
    }
  }

  const phaseIndex = checkpoint.phaseIndex
  const elapsedInPhaseMs = checkpoint.elapsedInPhaseMs
  if (
    phaseIndex === undefined ||
    elapsedInPhaseMs === undefined ||
    phaseIndex >= phases.length ||
    elapsedInPhaseMs >= (phases[phaseIndex]?.durationMs ?? 0)
  ) {
    clearWorkoutCheckpoint(storage)
    return undefined
  }

  const positioned = { phases, phaseIndex, elapsedInPhaseMs }
  if (checkpoint.status === 'paused') {
    return {
      workout: { status: 'paused', ...positioned },
      activeElapsedMs: checkpoint.activeElapsedMs,
      notice: restoredNotice,
      accuracyWarning: false,
    }
  }

  const wallClockDeltaMs = wallClockMs - checkpoint.wallClockMs
  if (wallClockDeltaMs < 0) {
    return {
      workout: { status: 'paused', ...positioned },
      activeElapsedMs: checkpoint.activeElapsedMs,
      notice:
        'The device clock changed, so timer accuracy could not be verified. The workout was restored paused.',
      accuracyWarning: true,
    }
  }

  const remainingMs = remainingScheduledMs(
    phases,
    phaseIndex,
    elapsedInPhaseMs,
  )
  const running: WorkoutState = {
    status: 'running',
    ...positioned,
    monotonicAnchorMs: monotonicNowMs - wallClockDeltaMs,
  }
  return {
    workout: projectWorkout(running, monotonicNowMs),
    activeElapsedMs:
      checkpoint.activeElapsedMs + Math.min(wallClockDeltaMs, remainingMs),
    notice: restoredNotice,
    accuracyWarning: false,
  }
}
