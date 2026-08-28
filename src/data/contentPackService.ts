import type { ContentPack, ContentPackDraft } from '../domain/contentPacks/types'
import type { AppPreferences } from '../domain/preferences/appPreferences'
import { appDatabase, type WheelOfPainDatabase } from './database'
import {
  ContentPackRepository,
  contentPackRepository,
} from './contentPackRepository'
import {
  PreferencesRepository,
  preferencesRepository,
} from './preferencesRepository'

export class ContentPackService {
  constructor(
    private readonly database: WheelOfPainDatabase = appDatabase,
    private readonly packs: ContentPackRepository = contentPackRepository,
    private readonly preferences: PreferencesRepository = preferencesRepository,
  ) {}

  async load(): Promise<{
    readonly packs: readonly ContentPack[]
    readonly preferences: AppPreferences
  }> {
    const [packs, preferences] = await Promise.all([
      this.packs.list(),
      this.preferences.get(),
    ])
    return { packs, preferences }
  }

  async select(id: string | null): Promise<void> {
    if (id !== null && (await this.packs.get(id)) === undefined) {
      throw new Error('The selected content pack is unavailable.')
    }
    await this.preferences.update({ selectedContentPackId: id })
  }

  async importAndSelect(draft: ContentPackDraft): Promise<ContentPack> {
    return this.database.transaction(
      'rw',
      [this.database.contentPacks, this.database.preferences],
      async () => {
        const pack = await this.packs.create(draft)
        await this.preferences.update({ selectedContentPackId: pack.id })
        return pack
      },
    )
  }

  async replaceAndSelect(
    id: string,
    draft: ContentPackDraft,
  ): Promise<ContentPack> {
    return this.database.transaction(
      'rw',
      [this.database.contentPacks, this.database.preferences],
      async () => {
        const pack = await this.packs.replace(id, draft)
        await this.preferences.update({ selectedContentPackId: pack.id })
        return pack
      },
    )
  }

  async remove(id: string, selected: boolean): Promise<void> {
    await this.database.transaction(
      'rw',
      [this.database.contentPacks, this.database.preferences],
      async () => {
        await this.packs.delete(id)
        if (selected) {
          await this.preferences.update({ selectedContentPackId: null })
        }
      },
    )
  }
}

export const contentPackService = new ContentPackService()

