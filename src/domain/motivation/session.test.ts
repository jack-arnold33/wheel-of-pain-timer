import { describe, expect, it } from 'vitest'
import type { ContentPack } from '../contentPacks/types'
import type { Participant } from '../participants/types'
import { MotivationSession } from './session'

const pack: ContentPack = {
  id: 'pack:test',
  schemaVersion: 1,
  name: 'Test',
  addressingMode: 'participant-prefix',
  voiceInstructions: 'Sound upbeat and direct.',
  sayings: {
    general: ['General one.', 'General two.'],
    work: ['Work now.'],
    finished: ['Finished.'],
  },
  extensions: {},
  createdAt: 1,
  updatedAt: 1,
}

const participants: Participant[] = [
  { id: 'a', name: 'A Full Name', spokenName: 'A', createdAt: 1, updatedAt: 1 },
  { id: 'b', name: 'B', createdAt: 1, updatedAt: 1 },
]

describe('MotivationSession', () => {
  it('uses a specific category and prefixes rotating participants', () => {
    const session = new MotivationSession(pack, participants, () => 0.99)
    expect(session.next('work')).toBe('A! Work now.')
    expect(session.next('work')).toBe('B! Work now.')
  })

  it('falls back to general and minimizes repetition across fallback moments', () => {
    const session = new MotivationSession(pack, [], () => 0.99)
    expect(session.next('cycleRest')).toBe('General one.')
    expect(session.next('cycleRest')).toBe('General two.')
  })

  it('skips an announcement when specific and general sayings are absent', () => {
    const session = new MotivationSession(
      { ...pack, sayings: { work: ['Work.'] } },
      [],
    )
    expect(session.next('finished')).toBeUndefined()
  })

  it('speaks personalized sayings exactly as authored without a name prefix', () => {
    const session = new MotivationSession(
      {
        ...pack,
        addressingMode: 'authored',
        sayings: { work: ['Alex, show Sam what questionable judgment looks like.'] },
      },
      participants,
      () => 0.99,
    )

    expect(session.next('work')).toBe(
      'Alex, show Sam what questionable judgment looks like.',
    )
  })
})

