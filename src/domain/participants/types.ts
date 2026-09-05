export interface Participant {
  readonly id: string
  readonly name: string
  readonly spokenName?: string
  readonly about?: string
  readonly motivationStyle?: ParticipantMotivationStyle
  readonly avoid?: string
  readonly createdAt: number
  readonly updatedAt: number
}

export const participantMotivationStyles = [
  'crew-default',
  'encouraging',
  'competitive',
  'playful',
  'ruthless',
] as const

export type ParticipantMotivationStyle =
  (typeof participantMotivationStyles)[number]

export const crewMotivationStyles = [
  'encouraging',
  'competitive',
  'playful',
  'ruthless',
] as const

export type CrewMotivationStyle = (typeof crewMotivationStyles)[number]

export interface ParticipantInput {
  readonly name: string
  readonly spokenName?: string
  readonly about?: string
  readonly motivationStyle?: ParticipantMotivationStyle
  readonly avoid?: string
}

export interface CrewProfile {
  readonly name: string
  readonly about: string
  readonly motivationStyle: CrewMotivationStyle
  readonly avoid: string
}

export const emptyCrewProfile: CrewProfile = {
  name: '',
  about: '',
  motivationStyle: 'encouraging',
  avoid: '',
}

