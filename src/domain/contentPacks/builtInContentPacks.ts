import type { ContentPack } from './types'
import { DEFAULT_VOICE_INSTRUCTIONS } from './validation'

export const BUILT_IN_STARTER_PACK_ID = 'builtin:workout-starter'

export const builtInStarterPack: ContentPack = {
  id: BUILT_IN_STARTER_PACK_ID,
  schemaVersion: 1,
  name: 'Workout Starter',
  voiceInstructions: DEFAULT_VOICE_INSTRUCTIONS,
  sayings: {
    general: ['Keep moving.', 'You have got this.'],
    work: ['Time to work.', 'Make this round count.'],
    cycleRest: ['Catch your breath. Another cycle is coming.'],
    finished: ['Workout complete. Nice work.'],
  },
  extensions: {},
  createdAt: 0,
  updatedAt: 0,
}

export const builtInContentPacks: readonly ContentPack[] = [builtInStarterPack]

export const isBuiltInContentPack = (id: string): boolean =>
  builtInContentPacks.some((pack) => pack.id === id)
