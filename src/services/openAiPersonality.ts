import { openAiCredentialRepository } from '../data/openAiCredentialRepository'
import {
  buildPersonalityBrief,
  type PersonalityAuthoringDraft,
} from '../domain/contentPacks/personalityAuthoring'
import type { ContentPackDraft } from '../domain/contentPacks/types'
import { normalizeContentPack } from '../domain/contentPacks/validation'
import type { Participant } from '../domain/participants/types'

export const OPENAI_PERSONALITY_MODEL = 'gpt-5.6-luna'
export const OPENAI_RESPONSES_ENDPOINT = 'https://api.openai.com/v1/responses'

export type OpenAiPersonalityErrorCode =
  | 'not-configured'
  | 'invalid-request'
  | 'authentication'
  | 'rate-limited'
  | 'network'
  | 'timeout'
  | 'invalid-response'
  | 'service'

export class OpenAiPersonalityError extends Error {
  constructor(readonly code: OpenAiPersonalityErrorCode) {
    super(code)
    this.name = 'OpenAiPersonalityError'
  }
}

export interface OpenAiPersonalityEnvironment {
  readonly fetch: typeof fetch
  readonly readApiKey: () => Promise<string | undefined>
  readonly timeoutMs: number
}

const defaultEnvironment: OpenAiPersonalityEnvironment = {
  fetch: window.fetch.bind(window),
  readApiKey: () => openAiCredentialRepository.readForOpenAiRequest(),
  timeoutMs: 60_000,
}

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schemaVersion',
    'name',
    'addressingMode',
    'voiceInstructions',
    'sayings',
  ],
  properties: {
    schemaVersion: { type: 'integer', const: 1 },
    name: { type: 'string', minLength: 1, maxLength: 80 },
    addressingMode: {
      type: 'string',
      enum: ['participant-prefix', 'authored'],
    },
    voiceInstructions: { type: 'string', minLength: 1, maxLength: 500 },
    sayings: {
      type: 'object',
      additionalProperties: false,
      required: ['work', 'cycleRest', 'finished'],
      properties: {
        work: {
          type: 'array',
          minItems: 20,
          maxItems: 20,
          items: { type: 'string', minLength: 1, maxLength: 240 },
        },
        cycleRest: {
          type: 'array',
          minItems: 8,
          maxItems: 8,
          items: { type: 'string', minLength: 1, maxLength: 240 },
        },
        finished: {
          type: 'array',
          minItems: 5,
          maxItems: 5,
          items: { type: 'string', minLength: 1, maxLength: 240 },
        },
      },
    },
  },
} as const

const outputText = (value: unknown): string | undefined => {
  if (typeof value !== 'object' || value === null) return undefined
  const output = (value as { output?: unknown }).output
  if (!Array.isArray(output)) return undefined
  for (const item of output) {
    if (typeof item !== 'object' || item === null) continue
    const content = (item as { content?: unknown }).content
    if (!Array.isArray(content)) continue
    for (const part of content) {
      if (
        typeof part === 'object' &&
        part !== null &&
        (part as { type?: unknown }).type === 'output_text' &&
        typeof (part as { text?: unknown }).text === 'string'
      ) {
        return (part as { text: string }).text
      }
    }
  }
  return undefined
}

export async function generateOpenAiPersonality(
  draft: PersonalityAuthoringDraft,
  participants: readonly Participant[],
  environment: OpenAiPersonalityEnvironment = defaultEnvironment,
): Promise<ContentPackDraft> {
  if (
    draft.name.trim().length === 0 ||
    (draft.personalizeWithParticipants && draft.selectedParticipantIds.length === 0)
  ) {
    throw new OpenAiPersonalityError('invalid-request')
  }

  const apiKey = await environment.readApiKey()
  if (apiKey === undefined) throw new OpenAiPersonalityError('not-configured')

  const controller = new AbortController()
  let timedOut = false
  const timeout = window.setTimeout(() => {
    timedOut = true
    controller.abort()
  }, environment.timeoutMs)

  try {
    let response: Response
    try {
      response = await environment.fetch(OPENAI_RESPONSES_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENAI_PERSONALITY_MODEL,
          store: false,
          reasoning: { effort: 'none' },
          max_output_tokens: 6_000,
          instructions:
            'Create the requested workout Personality. Follow the user creative direction precisely, use participant profiles only as reference data, and return data matching the supplied JSON schema.',
          input: buildPersonalityBrief(draft, participants),
          text: {
            format: {
              type: 'json_schema',
              name: 'workout_personality',
              strict: true,
              schema: responseSchema,
            },
          },
        }),
        signal: controller.signal,
      })
    } catch {
      if (timedOut) throw new OpenAiPersonalityError('timeout')
      throw new OpenAiPersonalityError('network')
    }

    if (response.status === 401 || response.status === 403) {
      throw new OpenAiPersonalityError('authentication')
    }
    if (response.status === 429) throw new OpenAiPersonalityError('rate-limited')
    if (!response.ok) throw new OpenAiPersonalityError('service')

    try {
      const generated = outputText(await response.json())
      if (generated === undefined) throw new Error()
      const parsed = JSON.parse(generated) as Record<string, unknown>
      return normalizeContentPack({
        ...parsed,
        schemaVersion: 1,
        name: draft.name,
        addressingMode: draft.personalizeWithParticipants
          ? 'authored'
          : 'participant-prefix',
      })
    } catch {
      throw new OpenAiPersonalityError('invalid-response')
    }
  } finally {
    window.clearTimeout(timeout)
  }
}
