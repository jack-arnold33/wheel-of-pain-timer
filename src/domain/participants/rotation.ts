import type { Participant } from './types'

const shuffle = <T>(values: readonly T[], random: () => number): T[] => {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

export class ParticipantRotation {
  private readonly participants: readonly Participant[]
  private queue: Participant[] = []
  private previousId?: string

  constructor(
    participants: readonly Participant[],
    private readonly random: () => number = Math.random,
  ) {
    this.participants = participants.map((participant) => ({ ...participant }))
  }

  next(): Participant | undefined {
    if (this.participants.length === 0) return undefined
    if (this.queue.length === 0) {
      this.queue = shuffle(this.participants, this.random)
      if (
        this.queue.length > 1 &&
        this.previousId !== undefined &&
        this.queue[0].id === this.previousId
      ) {
        ;[this.queue[0], this.queue[1]] = [this.queue[1], this.queue[0]]
      }
    }
    const participant = this.queue.shift()
    this.previousId = participant?.id
    return participant
  }
}

