import type { MotivationSession } from '../domain/motivation/session'
import type { WorkoutPhase } from '../domain/timer/types'
import {
  createOpenAiSpeech,
  OpenAiSpeechError,
  type OpenAiSpeechRequest,
  type OpenAiSpeechVoice,
} from '../services/openAiSpeech'
import {
  appAudioPlayer,
  type AudioPlaybackResult,
  type HtmlAudioPlayer,
} from './timerAudio'
import type { MotivationCategory } from './motivationCues'

export interface MotivationTarget {
  readonly id: string
  readonly phaseIndex: number
  readonly category: MotivationCategory
}

export interface OnlineMotivationOptions {
  readonly voice: OpenAiSpeechVoice
  readonly speed: number
  readonly voiceInstructions: string
}

type SpeechRequest = (
  request: OpenAiSpeechRequest,
) => Promise<Blob>

export const motivationTargets = (
  phases: readonly WorkoutPhase[],
): readonly MotivationTarget[] => {
  const targets: MotivationTarget[] = []
  phases.forEach((phase, phaseIndex) => {
    if (phase.kind === 'cycleRest') {
      targets.push({ id: `phase:${phaseIndex}`, phaseIndex, category: 'cycleRest' })
    } else if (phase.kind === 'work' && phase.exercise === 1) {
      targets.push({ id: `phase:${phaseIndex}`, phaseIndex, category: 'work' })
    }
  })
  targets.push({ id: 'complete', phaseIndex: phases.length, category: 'finished' })
  return targets
}

export class OnlineMotivationController {
  private readonly targets: readonly MotivationTarget[]
  private targetIndex = -1
  private operation = 0
  private requestController?: AbortController
  private disabled = false

  constructor(
    phases: readonly WorkoutPhase[],
    private readonly session: MotivationSession,
    private readonly options: OnlineMotivationOptions,
    private readonly onError: (code: string) => void,
    private readonly player: Pick<
      HtmlAudioPlayer,
      'prepareSpeech' | 'playPreparedSpeech' | 'cancelSpeech'
    > = appAudioPlayer,
    private readonly requestSpeech: SpeechRequest = createOpenAiSpeech,
  ) {
    this.targets = motivationTargets(phases)
  }

  startAt(phaseIndex: number): void {
    this.targetIndex = this.targets.findIndex(
      (target) => target.phaseIndex >= phaseIndex,
    )
    this.prepareCurrent()
  }

  async arrive(targetId: string): Promise<AudioPlaybackResult> {
    const arrivedIndex = this.targets.findIndex((target) => target.id === targetId)
    if (arrivedIndex < 0) return 'not-ready'

    if (arrivedIndex !== this.targetIndex) {
      this.cancelRequest()
      this.player.cancelSpeech()
      this.targetIndex = arrivedIndex
    } else {
      this.cancelRequest()
    }

    const result = await this.player.playPreparedSpeech(targetId)
    this.targetIndex = arrivedIndex + 1
    this.prepareCurrent()
    return result
  }

  cancel(): void {
    this.operation += 1
    this.cancelRequest()
    this.player.cancelSpeech()
  }

  private prepareCurrent(): void {
    const target = this.targets[this.targetIndex]
    if (target === undefined || this.disabled) return
    const text = this.session.next(target.category)
    if (text === undefined) {
      this.targetIndex += 1
      this.prepareCurrent()
      return
    }

    const operation = ++this.operation
    const controller = new AbortController()
    this.requestController = controller
    void this.requestSpeech({
      text,
      voice: this.options.voice,
      speed: this.options.speed,
      voiceInstructions: this.options.voiceInstructions,
      signal: controller.signal,
    })
      .then((blob) => {
        if (
          operation !== this.operation ||
          controller.signal.aborted ||
          this.targets[this.targetIndex]?.id !== target.id
        ) {
          return
        }
        this.player.prepareSpeech(target.id, blob)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || operation !== this.operation) return
        const code = error instanceof OpenAiSpeechError ? error.code : 'service'
        if (code === 'authentication' || code === 'not-configured') {
          this.disabled = true
        }
        this.onError(code)
      })
  }

  private cancelRequest(): void {
    this.operation += 1
    this.requestController?.abort()
    this.requestController = undefined
  }
}
