import type { TimerCue } from './timerCues'

type WebkitAudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext
  }

type AudioSessionNavigator = Navigator & {
  audioSession?: {
    type: string
  }
}

let audioContext: AudioContext | undefined

function configurePlaybackAudioSession() {
  const audioSession = (navigator as AudioSessionNavigator).audioSession
  if (audioSession === undefined) return
  try {
    audioSession.type = 'playback'
  } catch {
    // Experimental browser APIs can reject unsupported session types.
  }
}

function getAudioContext(): AudioContext | undefined {
  if (audioContext !== undefined) return audioContext
  if (typeof window === 'undefined') return undefined

  const AudioContextClass =
    window.AudioContext ?? (window as WebkitAudioWindow).webkitAudioContext
  if (AudioContextClass === undefined) return undefined

  audioContext = new AudioContextClass()
  return audioContext
}

export function primeTimerAudio() {
  configurePlaybackAudioSession()
  const context = getAudioContext()
  if (context?.state === 'suspended') void context.resume().catch(() => undefined)
}

function tone(
  context: AudioContext,
  frequency: number,
  startsAt: number,
  durationSeconds: number,
  peakGain: number,
) {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, startsAt)
  gain.gain.setValueAtTime(0.0001, startsAt)
  gain.gain.exponentialRampToValueAtTime(peakGain, startsAt + 0.01)
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    startsAt + durationSeconds,
  )
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(startsAt)
  oscillator.stop(startsAt + durationSeconds)
}

const countdownTone = (
  context: AudioContext,
  second: number,
  startsAt: number,
) => {
  if (second === 3) {
    tone(context, 700, startsAt, 0.16, 0.38)
    return
  }
  if (second === 2) {
    tone(context, 880, startsAt, 0.18, 0.44)
    return
  }

  // The last warning is longer, louder, and harmonically richer so it remains
  // recognizable when music and workout noise mask a simple sine tone.
  tone(context, 1_100, startsAt, 0.26, 0.52)
  tone(context, 1_650, startsAt, 0.2, 0.18)
}

export function playTimerCues(cues: readonly TimerCue[]) {
  if (cues.length === 0) return
  configurePlaybackAudioSession()
  const context = getAudioContext()
  if (context === undefined) return
  if (context.state === 'suspended') void context.resume().catch(() => undefined)

  let startsAt = context.currentTime
  for (const cue of cues) {
    if (cue.kind === 'transition') {
      tone(context, 880, startsAt, 0.13, 0.48)
      tone(context, 1_320, startsAt + 0.14, 0.2, 0.56)
      startsAt += 0.38
    } else {
      countdownTone(context, cue.second, startsAt)
      startsAt += 0.3
    }
  }
}
