import { CONTENT_PACK_SCHEMA_VERSION, type ContentPackDraft } from './types'
import { InvalidContentPackError, normalizeContentPack } from './validation'

export const PERSONALITY_AUTHORING_DRAFT_KEY =
  'wheel-of-pain:personality-authoring-draft:v1'

export const personalityAuthoringCategories = [
  'general',
  'work',
  'cycleRest',
  'finished',
] as const

export type PersonalityAuthoringCategory =
  (typeof personalityAuthoringCategories)[number]

export interface PersonalityAuthoringDraft {
  readonly schemaVersion: 1
  readonly step: 'ideas' | 'review'
  readonly name: string
  readonly tone: string
  readonly themes: string
  readonly avoid: string
  readonly response: string
  readonly sayings: Readonly<Record<PersonalityAuthoringCategory, string>>
}

export const emptyPersonalityAuthoringDraft = (): PersonalityAuthoringDraft => ({
  schemaVersion: 1,
  step: 'ideas',
  name: '',
  tone: '',
  themes: '',
  avoid: '',
  response: '',
  sayings: {
    general: '',
    work: '',
    cycleRest: '',
    finished: '',
  },
})

const text = (value: unknown): string => (typeof value === 'string' ? value : '')

export function loadPersonalityAuthoringDraft(
  storage: Pick<Storage, 'getItem'> = localStorage,
): PersonalityAuthoringDraft {
  try {
    const stored = storage.getItem(PERSONALITY_AUTHORING_DRAFT_KEY)
    if (stored === null) return emptyPersonalityAuthoringDraft()
    const parsed = JSON.parse(stored) as Record<string, unknown>
    const sayings =
      typeof parsed.sayings === 'object' && parsed.sayings !== null
        ? (parsed.sayings as Record<string, unknown>)
        : {}
    return {
      schemaVersion: 1,
      step: parsed.step === 'review' ? 'review' : 'ideas',
      name: text(parsed.name),
      tone: text(parsed.tone),
      themes: text(parsed.themes),
      avoid: text(parsed.avoid),
      response: text(parsed.response),
      sayings: {
        general: text(sayings.general),
        work: text(sayings.work),
        cycleRest: text(sayings.cycleRest),
        finished: text(sayings.finished),
      },
    }
  } catch {
    return emptyPersonalityAuthoringDraft()
  }
}

export function savePersonalityAuthoringDraft(
  draft: PersonalityAuthoringDraft,
  storage: Pick<Storage, 'setItem'> = localStorage,
): void {
  try {
    storage.setItem(PERSONALITY_AUTHORING_DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // Authoring remains available when browser storage is unavailable.
  }
}

export function clearPersonalityAuthoringDraft(
  storage: Pick<Storage, 'removeItem'> = localStorage,
): void {
  try {
    storage.removeItem(PERSONALITY_AUTHORING_DRAFT_KEY)
  } catch {
    // A saved Personality is not invalidated by failure to clear its draft.
  }
}

const fencedPayload = (value: string): string => {
  const match = value.match(/```(?:json)?\s*([\s\S]*?)```/iu)
  return (match?.[1] ?? value).trim()
}

export function parsePastedPersonality(
  value: string,
  fallbackName: string,
): ContentPackDraft {
  const payload = fencedPayload(value)
  if (payload.length === 0) {
    throw new InvalidContentPackError('Paste the response from ChatGPT first.')
  }

  if (!payload.startsWith('{')) {
    return normalizeContentPack({
      schemaVersion: CONTENT_PACK_SCHEMA_VERSION,
      name: fallbackName,
      sayings: { general: payload.split(/\r?\n/u) },
    })
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(payload)
  } catch {
    throw new InvalidContentPackError(
      'The pasted response is not valid JSON. Ask ChatGPT to return only the requested JSON, then copy it again.',
    )
  }
  return normalizeContentPack(parsed)
}

export function buildPersonalityPrompt(
  draft: Pick<PersonalityAuthoringDraft, 'name' | 'tone' | 'themes' | 'avoid'>,
): string {
  const guidance = [
    draft.tone.trim() && `Tone: ${draft.tone.trim()}`,
    draft.themes.trim() && `Themes, recurring jokes, or group context: ${draft.themes.trim()}`,
    draft.avoid.trim() && `Avoid: ${draft.avoid.trim()}`,
  ].filter(Boolean)

  return [
    `Create a workout-timer Personality named ${JSON.stringify(draft.name.trim())}.`,
    ...guidance,
    '',
    'Write short phrases that sound natural when spoken aloud. Be creative, encouraging, and consistent with the requested tone. Do not include participant names or name placeholders; the app adds a participant name automatically. Do not use Markdown, emoji, or stage directions in the sayings.',
    '',
    'Generate exactly 10 general sayings, 20 work sayings, 8 cycle-rest sayings, and 5 finished sayings.',
    '',
    'Return only valid JSON with exactly this structure:',
    '{',
    '  "schemaVersion": 1,',
    `  "name": ${JSON.stringify(draft.name.trim())},`,
    '  "sayings": {',
    '    "general": ["general-purpose saying", "..."],',
    '    "work": ["saying for the beginning of a work round", "..."],',
    '    "cycleRest": ["saying for the beginning of a longer cycle rest", "..."],',
    '    "finished": ["saying for normal workout completion", "..."]',
    '  }',
    '}',
    '',
    'Every array item must be a JSON string of 240 characters or fewer. Do not include explanations or code fences.',
  ].join('\n')
}

export function authoringDraftFromPack(
  current: PersonalityAuthoringDraft,
  pack: ContentPackDraft,
): PersonalityAuthoringDraft {
  return {
    ...current,
    step: 'review',
    name: pack.name,
    sayings: {
      general: pack.sayings.general?.join('\n') ?? '',
      work: pack.sayings.work?.join('\n') ?? '',
      cycleRest: pack.sayings.cycleRest?.join('\n') ?? '',
      finished: pack.sayings.finished?.join('\n') ?? '',
    },
  }
}

export function contentPackFromAuthoringDraft(
  draft: PersonalityAuthoringDraft,
): ContentPackDraft {
  return normalizeContentPack({
    schemaVersion: CONTENT_PACK_SCHEMA_VERSION,
    name: draft.name,
    sayings: Object.fromEntries(
      personalityAuthoringCategories.map((category) => [
        category,
        draft.sayings[category].split(/\r?\n/u),
      ]),
    ),
  })
}
