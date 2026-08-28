import { describe, expect, it } from 'vitest'
import type { Participant } from './types'
import { ParticipantRotation } from './rotation'

const participant = (id: string): Participant => ({
  id,
  name: id,
  createdAt: 1,
  updatedAt: 1,
})

describe('ParticipantRotation', () => {
  it('returns no participant for an empty attendance snapshot', () => {
    expect(new ParticipantRotation([]).next()).toBeUndefined()
  })

  it('uses the only active participant for every announcement', () => {
    const rotation = new ParticipantRotation([participant('Jarno')])
    expect([rotation.next()?.name, rotation.next()?.name]).toEqual([
      'Jarno',
      'Jarno',
    ])
  })

  it('uses every participant once per pass and avoids a boundary repeat', () => {
    const rotation = new ParticipantRotation(
      [participant('A'), participant('B'), participant('C')],
      () => 0.99,
    )
    const firstPass = [rotation.next()!.id, rotation.next()!.id, rotation.next()!.id]
    const secondPass = [rotation.next()!.id, rotation.next()!.id, rotation.next()!.id]

    expect(new Set(firstPass)).toEqual(new Set(['A', 'B', 'C']))
    expect(new Set(secondPass)).toEqual(new Set(['A', 'B', 'C']))
    expect(secondPass[0]).not.toBe(firstPass[2])
  })

  it('snapshots participants independently of later roster changes', () => {
    const source = [participant('A')]
    const rotation = new ParticipantRotation(source)
    source.push(participant('B'))

    expect(rotation.next()?.id).toBe('A')
    expect(rotation.next()?.id).toBe('A')
  })
})

