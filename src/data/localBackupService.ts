import {
  LOCAL_BACKUP_SCHEMA_VERSION,
  validateLocalBackup,
  type LocalBackup,
} from '../domain/backup/localBackup'
import { APP_PREFERENCES_ID, appDatabase, type WheelOfPainDatabase } from './database'
import { PreferencesRepository, preferencesRepository } from './preferencesRepository'

export class LocalBackupService {
  constructor(
    private readonly database: WheelOfPainDatabase = appDatabase,
    private readonly preferences: PreferencesRepository = preferencesRepository,
  ) {}

  async export(): Promise<LocalBackup> {
    const preferences = await this.preferences.get()
    const [routines, contentPacks, participants] = await this.database.transaction(
      'r',
      [
        this.database.routines,
        this.database.contentPacks,
        this.database.participants,
      ],
      () =>
        Promise.all([
          this.database.routines.toArray(),
          this.database.contentPacks.toArray(),
          this.database.participants.toArray(),
        ]),
    )
    return validateLocalBackup({
      schemaVersion: LOCAL_BACKUP_SCHEMA_VERSION,
      routines,
      contentPacks,
      participants,
      preferences,
    })
  }

  async restore(value: unknown): Promise<void> {
    const backup = validateLocalBackup(value)
    await this.database.transaction(
      'rw',
      [
        this.database.routines,
        this.database.contentPacks,
        this.database.participants,
        this.database.preferences,
      ],
      async () => {
        await Promise.all([
          this.database.routines.clear(),
          this.database.contentPacks.clear(),
          this.database.participants.clear(),
          this.database.preferences.clear(),
        ])
        if (backup.routines.length > 0) {
          await this.database.routines.bulkPut([...backup.routines])
        }
        if (backup.contentPacks.length > 0) {
          await this.database.contentPacks.bulkPut([...backup.contentPacks])
        }
        if (backup.participants.length > 0) {
          await this.database.participants.bulkPut([...backup.participants])
        }
        await this.database.preferences.put({
          id: APP_PREFERENCES_ID,
          ...backup.preferences,
        })
      },
    )
  }
}

export const localBackupService = new LocalBackupService()
