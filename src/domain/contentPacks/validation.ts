import {
  CONTENT_PACK_SCHEMA_VERSION,
  contentPackCategories,
  type ContentPackDraft,
  type ContentPackSayings,
} from './types'

export const MAX_CONTENT_PACK_BYTES = 512 * 1024
const MAX_NAME_LENGTH = 80
const MAX_SAYING_LENGTH = 240
const MAX_CATEGORY_SAYINGS = 500
const MAX_TOTAL_SAYINGS = 1_000

export class InvalidContentPackError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidContentPackError'
  }
}

const characterCount = (value: string) => Array.from(value).length

export function normalizeContentPackName(name: unknown): string {
  if (typeof name !== 'string') {
    throw new InvalidContentPackError('The pack name is required.')
  }
  const normalized = name.trim()
  const length = characterCount(normalized)
  if (length < 1 || length > MAX_NAME_LENGTH) {
    throw new InvalidContentPackError(
      'The pack name must contain 1 through 80 characters.',
    )
  }
  return normalized
}

export function normalizeSayings(value: unknown): ContentPackSayings {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new InvalidContentPackError('The sayings field must be an object.')
  }

  const input = value as Record<string, unknown>
  const unknownCategory = Object.keys(input).find(
    (category) => !contentPackCategories.includes(category as never),
  )
  if (unknownCategory !== undefined) {
    throw new InvalidContentPackError(
      `Unknown saying category: ${unknownCategory}.`,
    )
  }

  const normalized: Partial<Record<(typeof contentPackCategories)[number], string[]>> = {}
  let total = 0
  for (const category of contentPackCategories) {
    const raw = input[category]
    if (raw === undefined) continue
    if (!Array.isArray(raw)) {
      throw new InvalidContentPackError(`${category} sayings must be an array.`)
    }

    const sayings: string[] = []
    const seen = new Set<string>()
    for (const entry of raw) {
      if (typeof entry !== 'string') {
        throw new InvalidContentPackError(
          `Every ${category} saying must be text.`,
        )
      }
      const saying = entry.trim()
      if (saying.length === 0) continue
      if (characterCount(saying) > MAX_SAYING_LENGTH) {
        throw new InvalidContentPackError(
          `A ${category} saying exceeds the 240-character limit.`,
        )
      }
      if (!seen.has(saying)) {
        seen.add(saying)
        sayings.push(saying)
      }
    }
    if (sayings.length > MAX_CATEGORY_SAYINGS) {
      throw new InvalidContentPackError(
        `${category} contains more than 500 sayings.`,
      )
    }
    if (sayings.length > 0) normalized[category] = sayings
    total += sayings.length
  }

  if (total === 0) {
    throw new InvalidContentPackError(
      'The pack must contain at least one non-empty supported saying.',
    )
  }
  if (total > MAX_TOTAL_SAYINGS) {
    throw new InvalidContentPackError('The pack contains more than 1,000 sayings.')
  }
  return normalized
}

export function normalizeContentPack(value: unknown): ContentPackDraft {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new InvalidContentPackError('The pack must be a JSON object.')
  }
  const input = value as Record<string, unknown>
  if (input.schemaVersion !== CONTENT_PACK_SCHEMA_VERSION) {
    throw new InvalidContentPackError(
      'schemaVersion is required and must be the supported integer version 1.',
    )
  }

  const { schemaVersion: _schemaVersion, name, sayings, ...extensions } = input
  void _schemaVersion
  return {
    schemaVersion: CONTENT_PACK_SCHEMA_VERSION,
    name: normalizeContentPackName(name),
    sayings: normalizeSayings(sayings),
    extensions,
  }
}

