import transitionBellUrl from '../assets/audio/transition-bell.wav?url'
import type { TimerCue } from './timerCues'

type AudioSessionNavigator = Navigator & {
  audioSession?: { type: string }
}

export type AudioPlaybackResult = 'started' | 'not-ready' | 'blocked' | 'failed'

interface MediaElement {
  src: string
  preload: string
  muted: boolean
  volume: number
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

interface PreparedSpeech {
  readonly targetId: string
  readonly url: string
  readonly element: MediaElement
  ready: boolean
  readyListener?: EventListener
  errorListener?: EventListener
  resolveReady?: (ready: boolean) => void
  readyTimeout?: number
}

interface ActiveSpeech {
  readonly targetId: string
  readonly url: string
  readonly element: MediaElement
  readonly endedListener: EventListener
  readonly errorListener: EventListener
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
  transition: transitionBellUrl,
} as const

const blockedPlayback = (error: unknown): AudioPlaybackResult =>
  error instanceof DOMException && error.name === 'NotAllowedError'
    ? 'blocked'
    : 'failed'

export class HtmlAudioPlayer {
  private readonly cues = new Map<string, MediaElement>()
  private readonly speechElements: readonly [MediaElement, MediaElement]
  private cueOperation = 0
  private activeCue?: MediaElement
  private activeSpeech?: ActiveSpeech
  private preparedSpeech?: PreparedSpeech
  private transitionVolume = 0.5
  private speechVolume = 1

  constructor(private readonly environment: PlayerEnvironment = browserEnvironment) {
    for (const source of Object.values(TIMER_CUE_ASSETS)) {
      const element = environment.createAudio(source)
      element.preload = 'auto'
      element.volume = this.transitionVolume
      this.cues.set(source, element)
    }
    this.speechElements = [environment.createAudio(), environment.createAudio()]
    for (const element of this.speechElements) element.preload = 'auto'
  }

  async prime(): Promise<void> {
    this.environment.configureAudioSession()
    for (const element of this.cues.values()) element.load()

    const element = this.cues.get(TIMER_CUE_ASSETS.transition)
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
        const element = this.cues.get(TIMER_CUE_ASSETS[cue.kind])
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
    this.cancelPreparedSpeech()
    const element = this.speechElements.find(
      (candidate) => candidate !== this.activeSpeech?.element,
    )
    if (element === undefined) return Promise.resolve(false)
    const url = this.environment.createObjectUrl(blob)
    element.src = url
    const initiallyReady = element.readyState >= 3
    const prepared: PreparedSpeech = {
      targetId,
      url,
      element,
      ready: initiallyReady,
    }
    this.preparedSpeech = prepared

    if (initiallyReady) {
      element.load()
      return Promise.resolve(true)
    }

    return new Promise((resolve) => {
      prepared.resolveReady = resolve
      const markReady: EventListener = () => {
        if (this.preparedSpeech !== prepared) return
        prepared.ready = true
        this.clearPreparedReadiness(prepared)
        resolve(true)
      }
      const reject: EventListener = () => {
        if (this.preparedSpeech !== prepared) return
        this.cancelPreparedSpeech()
      }
      prepared.readyListener = markReady
      prepared.errorListener = reject
      element.addEventListener('canplay', markReady)
      element.addEventListener('canplaythrough', markReady)
      element.addEventListener('error', reject, { once: true })
      prepared.readyTimeout = window.setTimeout(reject, 5_000)
      element.load()
    })
  }

  setTransitionVolume(volume: number): void {
    this.transitionVolume = Math.min(1, Math.max(0, volume))
    for (const element of this.cues.values()) element.volume = this.transitionVolume
  }

  setSpeechVolume(volume: number): void {
    this.speechVolume = Math.min(1, Math.max(0, volume))
    for (const element of this.speechElements) element.volume = this.speechVolume
  }

  async playSpeechPreview(blob: Blob): Promise<AudioPlaybackResult> {
    const targetId = 'settings-preview'
    if (!(await this.prepareSpeech(targetId, blob))) return 'failed'
    return this.playPreparedSpeech(targetId)
  }

  async playPreparedSpeech(targetId: string): Promise<AudioPlaybackResult> {
    const prepared = this.preparedSpeech
    if (prepared === undefined || prepared.targetId !== targetId || !prepared.ready) {
      if (prepared?.targetId === targetId) this.cancelPreparedSpeech()
      return 'not-ready'
    }

    this.clearPreparedReadiness(prepared)
    this.preparedSpeech = undefined
    this.cancelActiveSpeech()
    const finish: EventListener = () => this.releaseActiveSpeech(active)
    const active: ActiveSpeech = {
      targetId,
      url: prepared.url,
      element: prepared.element,
      endedListener: finish,
      errorListener: finish,
    }
    this.activeSpeech = active
    active.element.addEventListener('ended', finish, { once: true })
    active.element.addEventListener('error', finish, { once: true })
    active.element.currentTime = 0
    try {
      await active.element.play()
      return this.activeSpeech === active ? 'started' : 'not-ready'
    } catch (error) {
      this.releaseActiveSpeech(active)
      return blockedPlayback(error)
    }
  }

  cancelSpeech(): void {
    this.cancelActiveSpeech()
    this.cancelPreparedSpeech()
  }

  dispose(): void {
    this.stopCues()
    this.cancelSpeech()
    for (const cue of this.cues.values()) cue.pause()
  }

  private clearPreparedReadiness(prepared: PreparedSpeech): void {
    if (prepared.readyTimeout !== undefined) {
      window.clearTimeout(prepared.readyTimeout)
      prepared.readyTimeout = undefined
    }
    if (prepared.readyListener !== undefined) {
      prepared.element.removeEventListener('canplay', prepared.readyListener)
      prepared.element.removeEventListener('canplaythrough', prepared.readyListener)
      prepared.readyListener = undefined
    }
    if (prepared.errorListener !== undefined) {
      prepared.element.removeEventListener('error', prepared.errorListener)
      prepared.errorListener = undefined
    }
    prepared.resolveReady = undefined
  }

  private cancelPreparedSpeech(): void {
    const prepared = this.preparedSpeech
    if (prepared === undefined) return
    this.preparedSpeech = undefined
    prepared.resolveReady?.(false)
    this.clearPreparedReadiness(prepared)
    prepared.element.pause()
    this.environment.revokeObjectUrl(prepared.url)
  }

  private cancelActiveSpeech(): void {
    const active = this.activeSpeech
    if (active === undefined) return
    active.element.pause()
    this.releaseActiveSpeech(active)
  }

  private releaseActiveSpeech(active: ActiveSpeech): void {
    if (this.activeSpeech !== active) return
    this.activeSpeech = undefined
    active.element.removeEventListener('ended', active.endedListener)
    active.element.removeEventListener('error', active.errorListener)
    this.environment.revokeObjectUrl(active.url)
  }

  private interruptActiveSpeech(): void {
    this.cancelActiveSpeech()
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
      const timeout = window.setTimeout(finish, 2_500)
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
