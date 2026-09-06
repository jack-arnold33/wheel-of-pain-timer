import type {
  ContentPack,
  ContentPackCategory,
} from '../contentPacks/types'
import { ParticipantRotation } from '../participants/rotation'
import type { Participant } from '../participants/types'

const shuffle = <T>(values: readonly T[], random: () => number): T[] => {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

class SayingRotation {
  private queue: string[] = []
  private previous?: string

  constructor(
    private readonly sayings: readonly string[],
    private readonly random: () => number,
  ) {}

  next(): string | undefined {
    if (this.sayings.length === 0) return undefined
    if (this.queue.length === 0) {
      this.queue = shuffle(this.sayings, this.random)
      if (
        this.queue.length > 1 &&
        this.previous !== undefined &&
        this.queue[0] === this.previous
      ) {
        ;[this.queue[0], this.queue[1]] = [this.queue[1], this.queue[0]]
      }
    }
    const saying = this.queue.shift()
    this.previous = saying
    return saying
  }
}

export class MotivationSession {
  private readonly participantRotation: ParticipantRotation
  private readonly sayingRotations = new Map<ContentPackCategory, SayingRotation>()

  constructor(
    private readonly pack: ContentPack,
    participants: readonly Participant[],
    private readonly random: () => number = Math.random,
  ) {
    this.participantRotation = new ParticipantRotation(participants, random)
  }

  next(category: Exclude<ContentPackCategory, 'general'>): string | undefined {
    const selectedCategory =
      (this.pack.sayings[category]?.length ?? 0) > 0 ? category : 'general'
    const sayings = this.pack.sayings[selectedCategory] ?? []
    let rotation = this.sayingRotations.get(selectedCategory)
    if (rotation === undefined) {
      rotation = new SayingRotation(sayings, this.random)
      this.sayingRotations.set(selectedCategory, rotation)
    }
    const saying = rotation.next()
    if (saying === undefined) return undefined
    const participant = this.participantRotation.next()
    return participant === undefined ? saying : `${participant.name}! ${saying}`
  }
}

