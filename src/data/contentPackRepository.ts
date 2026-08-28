import type { ContentPack, ContentPackDraft } from '../domain/contentPacks/types'
import {
  normalizeContentPack,
  normalizeContentPackName,
} from '../domain/contentPacks/validation'
import {
  appDatabase,
  type ContentPackRecord,
  type WheelOfPainDatabase,
} from './database'

export class ContentPackNameConflictError extends Error {
  readonly conflictingPack: ContentPack

  constructor(pack: ContentPack) {
    super(`A content pack named ${pack.name} already exists.`)
    this.name = 'ContentPackNameConflictError'
    this.conflictingPack = pack
  }
}

export class ContentPackNotFoundError extends Error {
  constructor(id: string) {
    super(`Content pack was not found: ${id}`)
    this.name = 'ContentPackNotFoundError'
  }
}

const copyPack = (record: ContentPackRecord): ContentPack => ({
  ...record,
  sayings: Object.fromEntries(
    Object.entries(record.sayings).map(([category, sayings]) => [
      category,
      [...sayings],
    ]),
  ),
  extensions: structuredClone(record.extensions),
})

const createPackId = () => `pack:${crypto.randomUUID()}`
const normalizeDraft = (draft: ContentPackDraft) =>
  normalizeContentPack({
    ...draft.extensions,
    schemaVersion: draft.schemaVersion,
    name: draft.name,
    sayings: draft.sayings,
  })

export class ContentPackRepository {
  constructor(
    private readonly database: WheelOfPainDatabase = appDatabase,
    private readonly newId: () => string = createPackId,
    private readonly now: () => number = Date.now,
  ) {}

  async list(): Promise<readonly ContentPack[]> {
    return (await this.database.contentPacks.orderBy('name').toArray()).map(copyPack)
  }

  async get(id: string): Promise<ContentPack | undefined> {
    const record = await this.database.contentPacks.get(id)
    return record === undefined ? undefined : copyPack(record)
  }

  private async conflictingName(name: string, exceptId?: string) {
    const normalized = name.toLocaleLowerCase()
    const match = (await this.database.contentPacks.toArray()).find(
      (pack) =>
        pack.id !== exceptId && pack.name.toLocaleLowerCase() === normalized,
    )
    return match === undefined ? undefined : copyPack(match)
  }

  async create(draft: ContentPackDraft): Promise<ContentPack> {
    const normalizedDraft = normalizeDraft(draft)
    const name = normalizedDraft.name
    const conflict = await this.conflictingName(name)
    if (conflict !== undefined) throw new ContentPackNameConflictError(conflict)
    const timestamp = this.now()
    const record: ContentPackRecord = {
      ...normalizedDraft,
      name,
      id: this.newId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    await this.database.contentPacks.add(record)
    return copyPack(record)
  }

  async replace(id: string, draft: ContentPackDraft): Promise<ContentPack> {
    const existing = await this.database.contentPacks.get(id)
    if (existing === undefined) throw new ContentPackNotFoundError(id)
    const normalizedDraft = normalizeDraft(draft)
    const conflict = await this.conflictingName(normalizedDraft.name, id)
    if (conflict !== undefined) throw new ContentPackNameConflictError(conflict)
    const record: ContentPackRecord = {
      ...normalizedDraft,
      id,
      createdAt: existing.createdAt,
      updatedAt: this.now(),
    }
    await this.database.contentPacks.put(record)
    return copyPack(record)
  }

  async rename(id: string, name: string): Promise<ContentPack> {
    const existing = await this.database.contentPacks.get(id)
    if (existing === undefined) throw new ContentPackNotFoundError(id)
    const normalized = normalizeContentPackName(name)
    const conflict = await this.conflictingName(normalized, id)
    if (conflict !== undefined) throw new ContentPackNameConflictError(conflict)
    const record = { ...existing, name: normalized, updatedAt: this.now() }
    await this.database.contentPacks.put(record)
    return copyPack(record)
  }

  async delete(id: string): Promise<void> {
    const existing = await this.database.contentPacks.get(id)
    if (existing === undefined) throw new ContentPackNotFoundError(id)
    await this.database.contentPacks.delete(id)
  }
}

export const contentPackRepository = new ContentPackRepository()
