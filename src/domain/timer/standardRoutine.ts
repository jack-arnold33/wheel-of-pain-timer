import type { RoutineTiming } from './types'

export const standardRoutineTiming: RoutineTiming = {
  prepareSeconds: 10,
  workSeconds: 30,
  exerciseRestSeconds: 15,
  exercisesPerRound: 3,
  roundsPerCycle: 4,
  cycles: 4,
  cycleRestSeconds: 120,
  cooldownSeconds: 0,
}
