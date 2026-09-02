import { openAiCredentialRepository } from '../data/openAiCredentialRepository'
import { MAX_VOICE_INSTRUCTIONS_LENGTH } from '../domain/contentPacks/validation'

export const OPENAI_SPEECH_MODEL = 'gpt-4o-mini-tts'
export const OPENAI_SPEECH_ENDPOINT = 'https://api.openai.com/v1/audio/speech'
export const OPENAI_SPEECH_BASE_INSTRUCTIONS =
  'Read the supplied text exactly as written. Do not add, remove, rewrite, or repeat words. Pronounce any participant name clearly and finish the complete sentence.'
export const OPENAI_SPEECH_VOICES = [
  { id: 'alloy', label: 'Alloy' },
  { id: 'coral', label: 'Coral' },
  { id: 'nova', label: 'Nova' },
  { id: 'onyx', label: 'Onyx' },
] as const

export type OpenAiSpeechVoice = (typeof OPENAI_SPEECH_VOICES)[number]['id']
export type OpenAiSpeechErrorCode =
  | 'not-configured'
  | 'invalid-request'
  | 'authentication'
  | 'rate-limited'
  | 'network'
  | 'timeout'
  | 'cancelled'
  | 'invalid-response'
  | 'service'

export class OpenAiSpeechError extends Error {
  constructor(readonly code: OpenAiSpeechErrorCode) {
    super(code)
    this.name = 'OpenAiSpeechError'
  }
}

export interface OpenAiSpeechRequest {
  readonly text: string
  readonly voice: OpenAiSpeechVoice
  readonly speed: number
  readonly voiceInstructions: string
  readonly signal?: AbortSignal
}

interface OpenAiSpeechEnvironment {
  readonly fetch: typeof fetch
  readonly readApiKey: () => Promise<string | undefined>
  readonly timeoutMs: number
}

const defaultEnvironment: OpenAiSpeechEnvironment = {
  fetch: window.fetch.bind(window),
  readApiKey: () => openAiCredentialRepository.readForOpenAiRequest(),
  timeoutMs: 20_000,
}

const MAX_AUDIO_BYTES = 8 * 1024 * 1024
const voiceIds = new Set<string>(OPENAI_SPEECH_VOICES.map(({ id }) => id))

export async function createOpenAiSpeech(
  request: OpenAiSpeechRequest,
  environment: OpenAiSpeechEnvironment = defaultEnvironment,
): Promise<Blob> {
  const text = request.text.trim()
  const voiceInstructions =
    typeof request.voiceInstructions === 'string'
      ? request.voiceInstructions.trim()
      : ''
  if (
    text.length === 0 ||
    text.length > 4_096 ||
    voiceInstructions.length === 0 ||
    Array.from(voiceInstructions).length > MAX_VOICE_INSTRUCTIONS_LENGTH ||
    !voiceIds.has(request.voice) ||
    !Number.isFinite(request.speed) ||
    request.speed < 0.25 ||
    request.speed > 4
  ) {
    throw new OpenAiSpeechError('invalid-request')
  }

  const apiKey = await environment.readApiKey()
  if (apiKey === undefined) throw new OpenAiSpeechError('not-configured')

  const controller = new AbortController()
  let timedOut = false
  const abortFromCaller = () => controller.abort()
  request.signal?.addEventListener('abort', abortFromCaller, { once: true })
  if (request.signal?.aborted) controller.abort()
  const timeout = window.setTimeout(() => {
    timedOut = true
    controller.abort()
  }, environment.timeoutMs)

  try {
    let response: Response
    try {
      response = await environment.fetch(OPENAI_SPEECH_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENAI_SPEECH_MODEL,
          input: text,
          voice: request.voice,
          instructions: `${OPENAI_SPEECH_BASE_INSTRUCTIONS}\n\nPersonality delivery: ${voiceInstructions}`,
          response_format: 'mp3',
          speed: request.speed,
        }),
        signal: controller.signal,
      })
    } catch {
      if (timedOut) throw new OpenAiSpeechError('timeout')
      if (controller.signal.aborted) throw new OpenAiSpeechError('cancelled')
      throw new OpenAiSpeechError('network')
    }

    if (response.status === 401 || response.status === 403) {
      throw new OpenAiSpeechError('authentication')
    }
    if (response.status === 429) throw new OpenAiSpeechError('rate-limited')
    if (!response.ok) throw new OpenAiSpeechError('service')

    const contentType = response.headers.get('content-type')?.split(';')[0]
    const contentLength = Number(response.headers.get('content-length'))
    if (
      contentType !== 'audio/mpeg' ||
      (Number.isFinite(contentLength) && contentLength > MAX_AUDIO_BYTES)
    ) {
      throw new OpenAiSpeechError('invalid-response')
    }

    const blob = await response.blob()
    if (blob.size === 0 || blob.size > MAX_AUDIO_BYTES) {
      throw new OpenAiSpeechError('invalid-response')
    }
    return blob
  } finally {
    window.clearTimeout(timeout)
    request.signal?.removeEventListener('abort', abortFromCaller)
  }
}
