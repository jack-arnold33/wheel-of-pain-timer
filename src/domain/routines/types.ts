import type { RoutineTiming } from '../timer/types'

export interface RoutineInput {
  readonly name: string
  readonly timing: RoutineTiming
}

export interface ProtectedRoutine extends RoutineInput {
  readonly id: string
  readonly ownership: 'protected'
}

export interface UserRoutine extends RoutineInput {
  readonly id: string
  readonly ownership: 'user'
  readonly createdAt: number
  readonly updatedAt: number
}

export type Routine = ProtectedRoutine | UserRoutine
