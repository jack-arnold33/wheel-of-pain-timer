import type { ContentPack, ContentPackDraft } from '../domain/contentPacks/types'
import {
  builtInContentPacks,
  isBuiltInContentPack,
} from '../domain/contentPacks/builtInContentPacks'
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
    return { packs: [...builtInContentPacks, ...packs], preferences }
  }

  async select(id: string | null): Promise<void> {
    if (
      id !== null &&
      !isBuiltInContentPack(id) &&
      (await this.packs.get(id)) === undefined
    ) {
      throw new Error('The selected content pack is unavailable.')
    }
    await this.preferences.update({ selectedContentPackId: id })
  }

  async create(draft: ContentPackDraft): Promise<ContentPack> {
    return this.packs.create(draft)
  }

  async replace(id: string, draft: ContentPackDraft): Promise<ContentPack> {
    return this.packs.replace(id, draft)
  }

  async remove(id: string, selected: boolean): Promise<void> {
    if (isBuiltInContentPack(id)) {
      throw new Error('Built-in content packs cannot be removed.')
    }
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

