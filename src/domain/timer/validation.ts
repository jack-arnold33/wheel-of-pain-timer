import type { RoutineTiming } from './types'

const MAX_DURATION_SECONDS = 59 * 60 + 59
const MAX_COUNT = 99
const MAX_WORK_INTERVALS = 10_000
const MAX_SCHEDULED_SECONDS = 24 * 60 * 60

export type RoutineTimingField = keyof RoutineTiming | 'workIntervals' | 'scheduledSeconds'

export interface RoutineTimingIssue {
  readonly field: RoutineTimingField
  readonly message: string
}

const optionalDurationFields = [
  'prepareSeconds',
  'exerciseRestSeconds',
  'cycleRestSeconds',
  'cooldownSeconds',
] as const satisfies readonly (keyof RoutineTiming)[]

const countFields = [
  'exercisesPerRound',
  'roundsPerCycle',
  'cycles',
] as const satisfies readonly (keyof RoutineTiming)[]

export function calculateWorkIntervals(routine: RoutineTiming): number {
  return (
    routine.exercisesPerRound * routine.roundsPerCycle * routine.cycles
  )
}

export function calculateScheduledSeconds(routine: RoutineTiming): number {
  const workIntervals = calculateWorkIntervals(routine)
  const workIntervalsPerCycle =
    routine.exercisesPerRound * routine.roundsPerCycle
  const exerciseRests = routine.cycles * Math.max(0, workIntervalsPerCycle - 1)
  const cycleRests = Math.max(0, routine.cycles - 1)

  return (
    routine.prepareSeconds +
    workIntervals * routine.workSeconds +
    exerciseRests * routine.exerciseRestSeconds +
    cycleRests * routine.cycleRestSeconds +
    routine.cooldownSeconds
  )
}

export function validateRoutineTiming(
  routine: RoutineTiming,
): RoutineTimingIssue[] {
  const issues: RoutineTimingIssue[] = []

  for (const field of optionalDurationFields) {
    const value = routine[field]
    if (!Number.isInteger(value) || value < 0 || value > MAX_DURATION_SECONDS) {
      issues.push({
        field,
        message: 'Duration must be a whole number from 0 to 3,599 seconds.',
      })
    }
  }

  if (
    !Number.isInteger(routine.workSeconds) ||
    routine.workSeconds < 1 ||
    routine.workSeconds > MAX_DURATION_SECONDS
  ) {
    issues.push({
      field: 'workSeconds',
      message: 'Work duration must be a whole number from 1 to 3,599 seconds.',
    })
  }

  for (const field of countFields) {
    const value = routine[field]
    if (!Number.isInteger(value) || value < 1 || value > MAX_COUNT) {
      issues.push({
        field,
        message: 'Count must be a whole number from 1 to 99.',
      })
    }
  }

  const workIntervals = calculateWorkIntervals(routine)
  if (Number.isFinite(workIntervals) && workIntervals > MAX_WORK_INTERVALS) {
    issues.push({
      field: 'workIntervals',
      message: 'A routine cannot contain more than 10,000 work intervals.',
    })
  }

  const scheduledSeconds = calculateScheduledSeconds(routine)
  if (
    Number.isFinite(scheduledSeconds) &&
    scheduledSeconds > MAX_SCHEDULED_SECONDS
  ) {
    issues.push({
      field: 'scheduledSeconds',
      message: 'A routine cannot be scheduled for more than 24 hours.',
    })
  }

  return issues
}

export class InvalidRoutineTimingError extends Error {
  readonly issues: readonly RoutineTimingIssue[]

  constructor(issues: readonly RoutineTimingIssue[]) {
    super('Routine timing is invalid.')
    this.name = 'InvalidRoutineTimingError'
    this.issues = issues
  }
}

export function assertValidRoutineTiming(routine: RoutineTiming): void {
  const issues = validateRoutineTiming(routine)
  if (issues.length > 0) throw new InvalidRoutineTimingError(issues)
}
