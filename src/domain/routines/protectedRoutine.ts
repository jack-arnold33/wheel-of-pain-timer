import { standardRoutineTiming } from '../timer/standardRoutine'
import type { ProtectedRoutine } from './types'

export const PROTECTED_ROUTINE_ID = 'preset:wheel-of-pain'

export const protectedStandardRoutine: ProtectedRoutine = {
  id: PROTECTED_ROUTINE_ID,
  ownership: 'protected',
  name: 'Wheel of Pain',
  timing: standardRoutineTiming,
}
