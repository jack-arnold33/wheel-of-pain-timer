import type { CrewProfile } from '../participants/types'

export interface AppPreferences {
  readonly themeId: string
  readonly timerSoundsEnabled: boolean
  readonly transitionVolume: number
  readonly spokenMotivationEnabled: boolean
  readonly voiceVolume: number
  readonly openAiFeaturesEnabled: boolean
  readonly useOpenAiVoice: boolean
  readonly voiceId: string | null
  readonly speechRate: number
  readonly selectedContentPackId: string | null
  readonly activeParticipantIds: readonly string[]
  readonly crewProfile: CrewProfile
}

export const defaultAppPreferences: AppPreferences = {
  themeId: 'wheel-of-pain',
  timerSoundsEnabled: true,
  transitionVolume: 0.5,
  spokenMotivationEnabled: true,
  voiceVolume: 1,
  openAiFeaturesEnabled: false,
  useOpenAiVoice: false,
  voiceId: null,
  speechRate: 1,
  selectedContentPackId: null,
  activeParticipantIds: [],
  crewProfile: { name: '', about: '', motivationStyle: 'encouraging', avoid: '' },
}
