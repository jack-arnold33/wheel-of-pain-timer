import type { RoutineTiming, WorkoutPhase } from './types'
import { assertValidRoutineTiming } from './validation'

const secondsToMs = (seconds: number) => seconds * 1_000

export function buildWorkoutSequence(routine: RoutineTiming): WorkoutPhase[] {
  assertValidRoutineTiming(routine)

  const phases: WorkoutPhase[] = []
  let workInterval = 0

  const addPhase = (phase: WorkoutPhase) => {
    if (phase.durationMs > 0) phases.push(phase)
  }

  addPhase({
    id: 'prepare',
    kind: 'prepare',
    durationMs: secondsToMs(routine.prepareSeconds),
  })

  for (let cycle = 1; cycle <= routine.cycles; cycle += 1) {
    for (let round = 1; round <= routine.roundsPerCycle; round += 1) {
      for (
        let exercise = 1;
        exercise <= routine.exercisesPerRound;
        exercise += 1
      ) {
        workInterval += 1
        addPhase({
          id: `work-${cycle}-${round}-${exercise}`,
          kind: 'work',
          durationMs: secondsToMs(routine.workSeconds),
          cycle,
          round,
          exercise,
          workInterval,
        })

        const isLastWorkOfCycle =
          round === routine.roundsPerCycle &&
          exercise === routine.exercisesPerRound

        if (isLastWorkOfCycle) {
          if (cycle < routine.cycles) {
            addPhase({
              id: `cycle-rest-${cycle}`,
              kind: 'cycleRest',
              durationMs: secondsToMs(routine.cycleRestSeconds),
              cycle,
            })
          }
        } else {
          addPhase({
            id: `exercise-rest-${cycle}-${round}-${exercise}`,
            kind: 'exerciseRest',
            durationMs: secondsToMs(routine.exerciseRestSeconds),
            cycle,
            round,
            exercise,
            workInterval,
          })
        }
      }
    }
  }

  addPhase({
    id: 'cooldown',
    kind: 'cooldown',
    durationMs: secondsToMs(routine.cooldownSeconds),
  })

  return phases
}
