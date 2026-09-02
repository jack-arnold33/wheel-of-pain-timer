import countdown1Url from '../assets/audio/countdown-1.wav?url'
import countdown2Url from '../assets/audio/countdown-2.wav?url'
import countdown3Url from '../assets/audio/countdown-3.wav?url'
import type { TimerCue } from './timerCues'

type AudioSessionNavigator = Navigator & {
  audioSession?: { type: string }
}

export type AudioPlaybackResult = 'started' | 'not-ready' | 'blocked' | 'failed'

interface MediaElement {
  src: string
  preload: string
  muted: boolean
  currentTime: number
  readonly readyState: number
  load(): void
  pause(): void
  play(): Promise<void>
  addEventListener(type: string, listener: EventListener, options?: AddEventListenerOptions): void
  removeEventListener(type: string, listener: EventListener): void
}

interface PlayerEnvironment {
  readonly createAudio: (src?: string) => MediaElement
  readonly createObjectUrl: (blob: Blob) => string
  readonly revokeObjectUrl: (url: string) => void
  readonly configureAudioSession: () => void
}

const configurePlaybackAudioSession = () => {
  const audioSession = (navigator as AudioSessionNavigator).audioSession
  if (audioSession === undefined) return
  try {
    audioSession.type = 'playback'
  } catch {
    // Experimental browser APIs can reject unsupported session types.
  }
}

const browserEnvironment: PlayerEnvironment = {
  createAudio: (src) => new Audio(src),
  createObjectUrl: (blob) => URL.createObjectURL(blob),
  revokeObjectUrl: (url) => URL.revokeObjectURL(url),
  configureAudioSession: configurePlaybackAudioSession,
}

export const TIMER_CUE_ASSETS = {
  'countdown-3': countdown3Url,
  'countdown-2': countdown2Url,
  'countdown-1': countdown1Url,
} as const

const cueAsset = (cue: TimerCue) =>
  TIMER_CUE_ASSETS[`countdown-${cue.second as 1 | 2 | 3}`]

const blockedPlayback = (error: unknown): AudioPlaybackResult =>
  error instanceof DOMException && error.name === 'NotAllowedError'
    ? 'blocked'
    : 'failed'

export class HtmlAudioPlayer {
  private readonly cues = new Map<string, MediaElement>()
  private readonly speech: MediaElement
  private cueOperation = 0
  private activeCue?: MediaElement
  private speechPlaying = false
  private preparedSpeech?: { targetId: string; url: string; ready: boolean }
  private speechReadyListener?: EventListener
  private speechErrorListener?: EventListener
  private resolveSpeechReady?: (ready: boolean) => void
  private speechReadyTimeout?: number

  constructor(private readonly environment: PlayerEnvironment = browserEnvironment) {
    for (const source of Object.values(TIMER_CUE_ASSETS)) {
      const element = environment.createAudio(source)
      element.preload = 'auto'
      this.cues.set(source, element)
    }
    this.speech = environment.createAudio()
    this.speech.preload = 'auto'
  }

  async prime(): Promise<void> {
    this.environment.configureAudioSession()
    for (const element of this.cues.values()) element.load()

    const element = this.cues.get(TIMER_CUE_ASSETS['countdown-1'])
    if (element === undefined) return
    element.muted = true
    try {
      await element.play()
      element.pause()
      element.currentTime = 0
    } catch {
      // A later real cue reports a bounded failure; startup is never blocked.
    } finally {
      element.muted = false
    }
  }

  playCues(cues: readonly TimerCue[]): Promise<AudioPlaybackResult> {
    if (cues.length === 0) return Promise.resolve('not-ready')
    this.interruptActiveSpeech()
    this.activeCue?.pause()
    const operation = ++this.cueOperation
    return (async () => {
      let finalResult: AudioPlaybackResult = 'not-ready'
      for (const cue of cues) {
        if (operation !== this.cueOperation) return 'not-ready'
        const element = this.cues.get(cueAsset(cue))
        if (element === undefined) {
          finalResult = 'failed'
          continue
        }
        this.activeCue = element
        element.pause()
        element.currentTime = 0
        try {
          await element.play()
          finalResult = 'started'
          await this.waitForCueEnd(element)
        } catch (error) {
          finalResult = blockedPlayback(error)
        } finally {
          if (this.activeCue === element) this.activeCue = undefined
        }
      }
      return finalResult
    })()
  }

  stopCues(): void {
    this.cueOperation += 1
    this.activeCue?.pause()
    this.activeCue = undefined
  }

  prepareSpeech(targetId: string, blob: Blob): Promise<boolean> {
    this.cancelSpeech()
    const url = this.environment.createObjectUrl(blob)
    this.speech.src = url
    const initiallyReady = this.speech.readyState >= 3
    this.preparedSpeech = { targetId, url, ready: initiallyReady }

    if (initiallyReady) {
      this.speech.load()
      return Promise.resolve(true)
    }

    return new Promise((resolve) => {
      this.resolveSpeechReady = resolve
      const markReady: EventListener = () => {
        if (this.preparedSpeech?.url !== url) return
        this.preparedSpeech.ready = true
        if (this.speechReadyTimeout !== undefined) {
          window.clearTimeout(this.speechReadyTimeout)
          this.speechReadyTimeout = undefined
        }
        this.resolveSpeechReady?.(true)
        this.resolveSpeechReady = undefined
      }
      const reject: EventListener = () => {
        if (this.preparedSpeech?.url !== url) return
        if (this.speechReadyTimeout !== undefined) {
          window.clearTimeout(this.speechReadyTimeout)
          this.speechReadyTimeout = undefined
        }
        this.resolveSpeechReady?.(false)
        this.resolveSpeechReady = undefined
        this.cancelSpeech()
      }
      this.speechReadyListener = markReady
      this.speechErrorListener = reject
      this.speech.addEventListener('canplay', markReady)
      this.speech.addEventListener('canplaythrough', markReady)
      this.speech.addEventListener('error', reject, { once: true })
      this.speechReadyTimeout = window.setTimeout(reject, 5_000)
      this.speech.load()
    })
  }

  async playSpeechPreview(blob: Blob): Promise<AudioPlaybackResult> {
    const targetId = 'settings-preview'
    if (!(await this.prepareSpeech(targetId, blob))) return 'failed'
    return this.playPreparedSpeech(targetId)
  }

  async playPreparedSpeech(targetId: string): Promise<AudioPlaybackResult> {
    const prepared = this.preparedSpeech
    if (prepared === undefined || prepared.targetId !== targetId || !prepared.ready) {
      if (prepared?.targetId === targetId) this.cancelSpeech()
      return 'not-ready'
    }

    this.speech.currentTime = 0
    try {
      await this.speech.play()
      this.speechPlaying = true
      const revoke: EventListener = () => {
        this.speechPlaying = false
        this.releasePreparedSpeech(prepared.url)
      }
      this.speech.addEventListener('ended', revoke, { once: true })
      return 'started'
    } catch (error) {
      this.releasePreparedSpeech(prepared.url)
      return blockedPlayback(error)
    }
  }

  cancelSpeech(): void {
    this.speech.pause()
    this.speechPlaying = false
    this.resolveSpeechReady?.(false)
    this.resolveSpeechReady = undefined
    if (this.speechReadyTimeout !== undefined) {
      window.clearTimeout(this.speechReadyTimeout)
      this.speechReadyTimeout = undefined
    }
    const url = this.preparedSpeech?.url
    if (url !== undefined) this.releasePreparedSpeech(url)
  }

  dispose(): void {
    this.stopCues()
    this.cancelSpeech()
    for (const cue of this.cues.values()) cue.pause()
  }

  private releasePreparedSpeech(url: string): void {
    if (this.preparedSpeech?.url !== url) return
    if (this.speechReadyListener !== undefined) {
      this.speech.removeEventListener('canplay', this.speechReadyListener)
      this.speech.removeEventListener('canplaythrough', this.speechReadyListener)
    }
    if (this.speechErrorListener !== undefined) {
      this.speech.removeEventListener('error', this.speechErrorListener)
    }
    this.preparedSpeech = undefined
    this.speechReadyListener = undefined
    this.speechErrorListener = undefined
    this.environment.revokeObjectUrl(url)
  }

  private interruptActiveSpeech(): void {
    if (this.speechPlaying) this.cancelSpeech()
  }

  private waitForCueEnd(element: MediaElement): Promise<void> {
    return new Promise((resolve) => {
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        window.clearTimeout(timeout)
        element.removeEventListener('ended', finish)
        element.removeEventListener('error', finish)
        resolve()
      }
      const timeout = window.setTimeout(finish, 700)
      element.addEventListener('ended', finish, { once: true })
      element.addEventListener('error', finish, { once: true })
    })
  }
}

export const appAudioPlayer = new HtmlAudioPlayer()

export function primeTimerAudio() {
  void appAudioPlayer.prime()
}

export function playTimerCues(cues: readonly TimerCue[]) {
  void appAudioPlayer.playCues(cues)
}

export function stopTimerCues() {
  appAudioPlayer.stopCues()
}
