export interface AppPreferences {
  readonly themeId: string
  readonly timerSoundsEnabled: boolean
  readonly transitionVolume: number
  readonly spokenMotivationEnabled: boolean
  readonly voiceVolume: number
  readonly allowOnlineVoices: boolean
  readonly voiceId: string | null
  readonly speechRate: number
  readonly selectedContentPackId: string | null
  readonly activeParticipantIds: readonly string[]
}

export const defaultAppPreferences: AppPreferences = {
  themeId: 'wheel-of-pain',
  timerSoundsEnabled: true,
  transitionVolume: 0.5,
  spokenMotivationEnabled: true,
  voiceVolume: 1,
  allowOnlineVoices: false,
  voiceId: null,
  speechRate: 1,
  selectedContentPackId: null,
  activeParticipantIds: [],
}
