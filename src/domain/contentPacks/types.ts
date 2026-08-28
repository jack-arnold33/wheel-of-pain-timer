export const CONTENT_PACK_SCHEMA_VERSION = 1 as const

export const contentPackCategories = [
  'general',
  'work',
  'cycleRest',
  'finished',
] as const

export type ContentPackCategory = (typeof contentPackCategories)[number]

export type ContentPackSayings = Readonly<
  Partial<Record<ContentPackCategory, readonly string[]>>
>

export interface ContentPackDraft {
  readonly schemaVersion: typeof CONTENT_PACK_SCHEMA_VERSION
  readonly name: string
  readonly sayings: ContentPackSayings
  readonly extensions: Readonly<Record<string, unknown>>
}

export interface ContentPack extends ContentPackDraft {
  readonly id: string
  readonly createdAt: number
  readonly updatedAt: number
}

