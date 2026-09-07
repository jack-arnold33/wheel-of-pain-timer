import { describe, expect, it, vi } from 'vitest'
import { emptyPersonalityAuthoringDraft } from '../domain/contentPacks/personalityAuthoring'
import {
  generateOpenAiPersonality,
  OPENAI_PERSONALITY_MODEL,
} from './openAiPersonality'

const generatedPack = {
  schemaVersion: 1,
  name: 'Wrong model name',
  addressingMode: 'participant-prefix',
  voiceInstructions: 'Sound sharp, dry, and relentless.',
  sayings: {
    work: Array.from({ length: 20 }, (_, index) => `Work ${index + 1}.`),
    cycleRest: Array.from({ length: 8 }, (_, index) => `Rest ${index + 1}.`),
    finished: Array.from({ length: 5 }, (_, index) => `Done ${index + 1}.`),
  },
}

describe('generateOpenAiPersonality', () => {
  it('uses the saved key, structured output, and only selected participant profiles', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        output: [
          {
            content: [
              { type: 'output_text', text: JSON.stringify(generatedPack) },
            ],
          },
        ],
      }),
    })
    const draft = {
      ...emptyPersonalityAuthoringDraft(),
      name: 'Tuesday Crew',
      personalizeWithParticipants: true,
      selectedParticipantIds: ['participant:alex'],
    }

    const pack = await generateOpenAiPersonality(
      draft,
      [
        {
          id: 'participant:alex',
          name: 'Alexandra',
          spokenName: 'Alex',
          about: 'Loves heavy kettlebells.',
          createdAt: 1,
          updatedAt: 1,
        },
        {
          id: 'participant:sam',
          name: 'Sam',
          about: 'Never skips leg day.',
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      { fetch: fetchMock, readApiKey: async () => 'sk-test', timeoutMs: 1_000 },
    )

    expect(pack).toMatchObject({
      schemaVersion: 1,
      name: 'Tuesday Crew',
      addressingMode: 'authored',
    })
    expect(fetchMock).toHaveBeenCalledOnce()
    const [endpoint, request] = fetchMock.mock.calls[0]
    expect(endpoint).toBe('https://api.openai.com/v1/responses')
    expect(request.headers.Authorization).toBe('Bearer sk-test')
    const body = JSON.parse(request.body)
    expect(body).toMatchObject({
      model: OPENAI_PERSONALITY_MODEL,
      store: false,
      reasoning: { effort: 'none' },
      text: { format: { type: 'json_schema', strict: true } },
    })
    expect(body.input).toContain('Name to use in sayings: Alex')
    expect(body.input).toContain('Loves heavy kettlebells.')
    expect(body.input).not.toContain('Never skips leg day.')
  })

  it('makes no request when no OpenAI key is configured', async () => {
    const fetchMock = vi.fn()
    await expect(
      generateOpenAiPersonality(
        { ...emptyPersonalityAuthoringDraft(), name: 'No Key' },
        [],
        { fetch: fetchMock, readApiKey: async () => undefined, timeoutMs: 1_000 },
      ),
    ).rejects.toMatchObject({ code: 'not-configured' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
