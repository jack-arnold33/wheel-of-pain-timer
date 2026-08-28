export interface AppPreferences {
  readonly themeId: string
  readonly timerSoundsEnabled: boolean
  readonly spokenMotivationEnabled: boolean
  readonly allowOnlineVoices: boolean
  readonly voiceId: string | null
  readonly speechRate: number
  readonly selectedContentPackId: string | null
  readonly activeParticipantIds: readonly string[]
}

export const defaultAppPreferences: AppPreferences = {
  themeId: 'wheel-of-pain',
  timerSoundsEnabled: true,
  spokenMotivationEnabled: true,
  allowOnlineVoices: false,
  voiceId: null,
  speechRate: 1,
  selectedContentPackId: null,
  activeParticipantIds: [],
}
