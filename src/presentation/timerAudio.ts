import type { TimerCue } from './timerCues'

type WebkitAudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext
  }

let audioContext: AudioContext | undefined

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
  const context = getAudioContext()
  if (context?.state === 'suspended') void context.resume().catch(() => undefined)
}

function tone(
  context: AudioContext,
  frequency: number,
  startsAt: number,
  durationSeconds: number,
) {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, startsAt)
  gain.gain.setValueAtTime(0.0001, startsAt)
  gain.gain.exponentialRampToValueAtTime(0.18, startsAt + 0.01)
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    startsAt + durationSeconds,
  )
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(startsAt)
  oscillator.stop(startsAt + durationSeconds)
}

export function playTimerCues(cues: readonly TimerCue[]) {
  if (cues.length === 0) return
  const context = getAudioContext()
  if (context === undefined) return
  if (context.state === 'suspended') void context.resume().catch(() => undefined)

  let startsAt = context.currentTime
  for (const cue of cues) {
    if (cue.kind === 'transition') {
      tone(context, 880, startsAt, 0.1)
      tone(context, 1_320, startsAt + 0.11, 0.14)
      startsAt += 0.3
    } else {
      tone(context, cue.second === 1 ? 1_100 : 760, startsAt, 0.09)
      startsAt += 0.12
    }
  }
}
