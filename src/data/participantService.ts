import type { Participant } from '../domain/participants/types'
import { appDatabase, type WheelOfPainDatabase } from './database'
import {
  ParticipantRepository,
  participantRepository,
} from './participantRepository'
import {
  PreferencesRepository,
  preferencesRepository,
} from './preferencesRepository'

export interface ParticipantState {
  readonly participants: readonly Participant[]
  readonly activeIds: readonly string[]
}

export class ParticipantService {
  constructor(
    private readonly database: WheelOfPainDatabase = appDatabase,
    private readonly participants: ParticipantRepository = participantRepository,
    private readonly preferences: PreferencesRepository = preferencesRepository,
  ) {}

  async load(): Promise<ParticipantState> {
    const [participants, preferences] = await Promise.all([
      this.participants.list(),
      this.preferences.get(),
    ])
    const availableIds = new Set(participants.map(({ id }) => id))
    const activeIds = preferences.activeParticipantIds.filter((id) =>
      availableIds.has(id),
    )
    if (activeIds.length !== preferences.activeParticipantIds.length) {
      await this.preferences.update({ activeParticipantIds: activeIds })
    }
    return { participants, activeIds }
  }

  async saveAttendance(ids: readonly string[]): Promise<readonly string[]> {
    const available = new Set(
      (await this.participants.list()).map(({ id }) => id),
    )
    const activeIds = [...new Set(ids)].filter((id) => available.has(id))
    await this.preferences.update({ activeParticipantIds: activeIds })
    return activeIds
  }

  async createAndActivate(name: string): Promise<Participant> {
    return this.database.transaction(
      'rw',
      [this.database.participants, this.database.preferences],
      async () => {
        const participant = await this.participants.create(name)
        const preferences = await this.preferences.get()
        await this.preferences.update({
          activeParticipantIds: [
            ...preferences.activeParticipantIds,
            participant.id,
          ],
        })
        return participant
      },
    )
  }

  async rename(id: string, name: string): Promise<Participant> {
    return this.participants.rename(id, name)
  }

  async remove(id: string): Promise<void> {
    await this.database.transaction(
      'rw',
      [this.database.participants, this.database.preferences],
      async () => {
        await this.participants.delete(id)
        const preferences = await this.preferences.get()
        await this.preferences.update({
          activeParticipantIds: preferences.activeParticipantIds.filter(
            (activeId) => activeId !== id,
          ),
        })
      },
    )
  }
}

export const participantService = new ParticipantService()

