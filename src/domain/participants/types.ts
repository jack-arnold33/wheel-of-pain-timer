export interface Participant {
  readonly id: string
  readonly name: string
  readonly spokenName?: string
  readonly about?: string
  readonly createdAt: number
  readonly updatedAt: number
}

export interface ParticipantInput {
  readonly name: string
  readonly spokenName?: string
  readonly about?: string
}

