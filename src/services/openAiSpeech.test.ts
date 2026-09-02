import { describe, expect, it, vi } from 'vitest'
import {
  createOpenAiSpeech,
  OpenAiSpeechError,
  OPENAI_SPEECH_BASE_INSTRUCTIONS,
  OPENAI_SPEECH_ENDPOINT,
} from './openAiSpeech'

const request = {
  text: 'Jarno! Form first. Complaining second.',
  voice: 'alloy' as const,
  speed: 1,
  voiceInstructions: 'Sound like a relentless but supportive boxing coach.',
}

const environment = (
  response: Response | Promise<Response>,
  apiKey: string | null = 'sk-proj-secret-example-123456',
) => {
  const fetchMock = vi.fn<typeof fetch>(async () => response)
  return {
    fetch: fetchMock,
    readApiKey: vi.fn(async () => apiKey ?? undefined),
    timeoutMs: 1_000,
  }
}

describe('createOpenAiSpeech', () => {
  it('sends only the selected utterance fields and returns an MP3 blob', async () => {
    const env = environment(
      new Response('audio', { headers: { 'Content-Type': 'audio/mpeg' } }),
    )
    const audio = await createOpenAiSpeech(request, env)
    expect(audio.size).toBeGreaterThan(0)

    expect(env.fetch).toHaveBeenCalledWith(
      OPENAI_SPEECH_ENDPOINT,
      expect.objectContaining({ method: 'POST' }),
    )
    const init = env.fetch.mock.calls[0][1] as RequestInit
    expect(init.headers).toEqual({
      Authorization: 'Bearer sk-proj-secret-example-123456',
      'Content-Type': 'application/json',
    })
    expect(JSON.parse(String(init.body))).toEqual({
      model: 'gpt-4o-mini-tts',
      input: request.text,
      voice: 'alloy',
      instructions: `${OPENAI_SPEECH_BASE_INSTRUCTIONS}\n\nPersonality delivery: ${request.voiceInstructions}`,
      response_format: 'mp3',
      speed: 1,
    })
  })

  it('makes no request without a configured credential', async () => {
    const env = environment(new Response(), null)
    await expect(createOpenAiSpeech(request, env)).rejects.toMatchObject({
      code: 'not-configured',
    })
    expect(env.fetch).not.toHaveBeenCalled()
  })

  it('rejects missing Personality voice instructions before making a request', async () => {
    const env = environment(new Response())
    await expect(
      createOpenAiSpeech({ ...request, voiceInstructions: ' ' }, env),
    ).rejects.toMatchObject({ code: 'invalid-request' })
    expect(env.fetch).not.toHaveBeenCalled()
  })

  it.each([
    [401, 'authentication'],
    [403, 'authentication'],
    [429, 'rate-limited'],
    [500, 'service'],
  ] as const)('normalizes status %s without retaining its body', async (status, code) => {
    const env = environment(
      new Response('provider details must stay private', { status }),
    )
    await expect(createOpenAiSpeech(request, env)).rejects.toEqual(
      new OpenAiSpeechError(code),
    )
  })

  it('rejects non-audio and empty responses', async () => {
    await expect(
      createOpenAiSpeech(
        request,
        environment(new Response('nope', { headers: { 'Content-Type': 'text/plain' } })),
      ),
    ).rejects.toMatchObject({ code: 'invalid-response' })
    await expect(
      createOpenAiSpeech(
        request,
        environment(new Response(null, { headers: { 'Content-Type': 'audio/mpeg' } })),
      ),
    ).rejects.toMatchObject({ code: 'invalid-response' })
  })

  it('aborts a request without exposing its input or key in the error', async () => {
    const env = environment(new Response())
    env.fetch.mockImplementation((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_, reject) => {
        if (init?.signal?.aborted) {
          reject(new DOMException('aborted'))
          return
        }
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted')))
      }),
    )
    const controller = new AbortController()
    const pending = createOpenAiSpeech({ ...request, signal: controller.signal }, env)
    controller.abort()
    const error = await pending.catch((caught: unknown) => caught)
    expect(error).toMatchObject({ code: 'cancelled' })
    expect(String(error)).not.toContain(request.text)
    expect(String(error)).not.toContain('sk-proj')
  })
})
