export interface MotivationSpeechOptions {
  readonly allowOnlineVoices: boolean
  readonly voiceId: string | null
  readonly rate: number
}

export type MotivationSpeechResult =
  | 'spoken'
  | 'spoken-with-fallback'
  | 'unsupported'
  | 'no-eligible-voice'

interface SpeechEnvironment {
  readonly synthesis: Pick<
    SpeechSynthesis,
    'getVoices' | 'speak' | 'resume'
  >
  readonly createUtterance: (text: string) => SpeechSynthesisUtterance
}

const browserEnvironment = (): SpeechEnvironment | undefined => {
  if (
    typeof window === 'undefined' ||
    window.speechSynthesis === undefined ||
    window.SpeechSynthesisUtterance === undefined
  ) {
    return undefined
  }
  return {
    synthesis: window.speechSynthesis,
    createUtterance: (text) => new window.SpeechSynthesisUtterance(text),
  }
}

const eligibleVoice = (
  voices: readonly SpeechSynthesisVoice[],
  options: MotivationSpeechOptions,
) => {
  const eligible = voices.filter(
    (voice) => options.allowOnlineVoices || voice.localService === true,
  )
  if (options.voiceId !== null) {
    const selected = eligible.find((voice) => voice.voiceURI === options.voiceId)
    if (selected !== undefined) return { voice: selected, fallback: false }
  }
  const fallback = eligible.find((voice) => voice.default) ?? eligible[0]
  return fallback === undefined
    ? undefined
    : { voice: fallback, fallback: options.voiceId !== null }
}

export function primeSpokenMotivation(
  environment: SpeechEnvironment | undefined = browserEnvironment(),
) {
  try {
    environment?.synthesis.resume()
    environment?.synthesis.getVoices()
  } catch {
    // Speech synthesis is optional and must never block timer startup.
  }
}

export function speakMotivation(
  text: string,
  options: MotivationSpeechOptions,
  environment: SpeechEnvironment | undefined = browserEnvironment(),
): MotivationSpeechResult {
  if (environment === undefined) return 'unsupported'
  const selection = eligibleVoice(environment.synthesis.getVoices(), options)
  if (selection === undefined) return 'no-eligible-voice'

  const utterance = environment.createUtterance(text)
  utterance.voice = selection.voice
  utterance.lang = selection.voice.lang
  utterance.rate = Math.min(2, Math.max(0.5, options.rate))
  environment.synthesis.speak(utterance)
  return selection.fallback ? 'spoken-with-fallback' : 'spoken'
}
