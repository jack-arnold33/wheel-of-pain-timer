import { isBuiltInContentPack } from '../contentPacks/builtInContentPacks'
import { normalizeContentPack } from '../contentPacks/validation'
import {
  defaultAppPreferences,
  type AppPreferences,
} from '../preferences/appPreferences'
import { PROTECTED_ROUTINE_ID } from '../routines/protectedRoutine'
import { assertValidRoutineTiming } from '../timer/validation'
import type {
  ContentPackRecord,
  ParticipantRecord,
  UserRoutineRecord,
} from '../../data/database'

export const LOCAL_BACKUP_SCHEMA_VERSION = 1 as const

export interface LocalBackup {
  readonly schemaVersion: typeof LOCAL_BACKUP_SCHEMA_VERSION
  readonly routines: readonly UserRoutineRecord[]
  readonly contentPacks: readonly ContentPackRecord[]
  readonly participants: readonly ParticipantRecord[]
  readonly preferences: AppPreferences
}

export class InvalidLocalBackupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidLocalBackupError'
  }
}

const record = (value: unknown, label: string): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new InvalidLocalBackupError(`${label} must be an object.`)
  }
  return value as Record<string, unknown>
}

const collection = (value: unknown, label: string): readonly unknown[] => {
  if (!Array.isArray(value)) {
    throw new InvalidLocalBackupError(`${label} collection is required.`)
  }
  return value
}

const text = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InvalidLocalBackupError(`${label} must be non-empty text.`)
  }
  return value
}

const timestamp = (value: unknown, label: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new InvalidLocalBackupError(`${label} must be a valid timestamp.`)
  }
  return value
}

const unique = (values: readonly string[], label: string) => {
  if (new Set(values).size !== values.length) {
    throw new InvalidLocalBackupError(`${label} must be unique.`)
  }
}

const validateRoutine = (value: unknown, index: number): UserRoutineRecord => {
  const input = record(value, `Routine ${index + 1}`)
  const id = text(input.id, `Routine ${index + 1} id`)
  if (id === PROTECTED_ROUTINE_ID) {
    throw new InvalidLocalBackupError(
      'The protected Wheel of Pain preset must not be included as user data.',
    )
  }
  const name = text(input.name, `Routine ${index + 1} name`).trim()
  const timing = record(input.timing, `Routine ${index + 1} timing`)
  try {
    assertValidRoutineTiming(timing as never)
  } catch {
    throw new InvalidLocalBackupError(`Routine ${index + 1} timing is invalid.`)
  }
  return {
    id,
    name,
    timing: {
      prepareSeconds: timing.prepareSeconds as number,
      workSeconds: timing.workSeconds as number,
      exerciseRestSeconds: timing.exerciseRestSeconds as number,
      exercisesPerRound: timing.exercisesPerRound as number,
      roundsPerCycle: timing.roundsPerCycle as number,
      cycles: timing.cycles as number,
      cycleRestSeconds: timing.cycleRestSeconds as number,
      cooldownSeconds: timing.cooldownSeconds as number,
    },
    createdAt: timestamp(input.createdAt, `Routine ${index + 1} createdAt`),
    updatedAt: timestamp(input.updatedAt, `Routine ${index + 1} updatedAt`),
  }
}

const validatePack = (value: unknown, index: number): ContentPackRecord => {
  const input = record(value, `Content pack ${index + 1}`)
  const id = text(input.id, `Content pack ${index + 1} id`)
  if (isBuiltInContentPack(id)) {
    throw new InvalidLocalBackupError('Built-in content packs must not be included as user data.')
  }
  let normalized
  try {
    normalized = normalizeContentPack({
      ...(record(input.extensions, `Content pack ${index + 1} extensions`)),
      schemaVersion: input.schemaVersion,
      name: input.name,
      voiceInstructions: input.voiceInstructions,
      sayings: input.sayings,
    })
  } catch (error) {
    throw new InvalidLocalBackupError(
      `Content pack ${index + 1} is invalid: ${error instanceof Error ? error.message : 'invalid content'}`,
    )
  }
  return {
    id,
    ...normalized,
    createdAt: timestamp(input.createdAt, `Content pack ${index + 1} createdAt`),
    updatedAt: timestamp(input.updatedAt, `Content pack ${index + 1} updatedAt`),
  }
}

const validateParticipant = (value: unknown, index: number): ParticipantRecord => {
  const input = record(value, `Participant ${index + 1}`)
  const name = text(input.name, `Participant ${index + 1} name`).trim()
  const length = Array.from(name).length
  if (length > 80) {
    throw new InvalidLocalBackupError(`Participant ${index + 1} name exceeds 80 characters.`)
  }
  return {
    id: text(input.id, `Participant ${index + 1} id`),
    name,
    createdAt: timestamp(input.createdAt, `Participant ${index + 1} createdAt`),
    updatedAt: timestamp(input.updatedAt, `Participant ${index + 1} updatedAt`),
  }
}

const validatePreferences = (
  value: unknown,
  packIds: ReadonlySet<string>,
  participantIds: ReadonlySet<string>,
): AppPreferences => {
  const input = record(value, 'Preferences')
  const boolean = (key: keyof AppPreferences) => {
    if (typeof input[key] !== 'boolean') {
      throw new InvalidLocalBackupError(`Preference ${key} must be true or false.`)
    }
    return input[key] as boolean
  }
  const themeId = text(input.themeId, 'Preference themeId')
  const voiceId = input.voiceId
  if (voiceId !== null && typeof voiceId !== 'string') {
    throw new InvalidLocalBackupError('Preference voiceId must be text or null.')
  }
  const speechRate = input.speechRate
  if (
    typeof speechRate !== 'number' ||
    !Number.isFinite(speechRate) ||
    speechRate < 0.5 ||
    speechRate > 2
  ) {
    throw new InvalidLocalBackupError('Preference speechRate must be from 0.5 through 2.')
  }
  const volume = (key: 'transitionVolume' | 'voiceVolume') => {
    const value = input[key]
    if (value === undefined) return defaultAppPreferences[key]
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > 1
    ) {
      throw new InvalidLocalBackupError(`Preference ${key} must be from 0 through 1.`)
    }
    return value
  }
  const selectedContentPackId = input.selectedContentPackId
  if (
    selectedContentPackId !== null &&
    (typeof selectedContentPackId !== 'string' ||
      (!packIds.has(selectedContentPackId) &&
        !isBuiltInContentPack(selectedContentPackId)))
  ) {
    throw new InvalidLocalBackupError(
      'The selected Personality does not exist in this backup or the app.',
    )
  }
  if (!Array.isArray(input.activeParticipantIds)) {
    throw new InvalidLocalBackupError('Preference activeParticipantIds must be an array.')
  }
  const activeParticipantIds = input.activeParticipantIds.map((id) =>
    text(id, 'Active participant id'),
  )
  unique(activeParticipantIds, 'Active participant ids')
  if (activeParticipantIds.some((id) => !participantIds.has(id))) {
    throw new InvalidLocalBackupError(
      'Remembered attendance references a participant not contained in the backup.',
    )
  }
  return {
    themeId,
    timerSoundsEnabled: boolean('timerSoundsEnabled'),
    transitionVolume: volume('transitionVolume'),
    spokenMotivationEnabled: boolean('spokenMotivationEnabled'),
    voiceVolume: volume('voiceVolume'),
    allowOnlineVoices: boolean('allowOnlineVoices'),
    voiceId,
    speechRate,
    selectedContentPackId,
    activeParticipantIds,
  }
}

export function validateLocalBackup(value: unknown): LocalBackup {
  const input = record(value, 'Backup')
  if (input.schemaVersion !== LOCAL_BACKUP_SCHEMA_VERSION) {
    throw new InvalidLocalBackupError(
      'schemaVersion is required and must be the supported integer version 1.',
    )
  }
  const routines = collection(input.routines, 'Routines').map(validateRoutine)
  const contentPacks = collection(input.contentPacks, 'Content packs').map(validatePack)
  const participants = collection(input.participants, 'Participants').map(validateParticipant)

  unique(routines.map(({ id }) => id), 'Routine ids')
  unique(contentPacks.map(({ id }) => id), 'Content pack ids')
  unique(participants.map(({ id }) => id), 'Participant ids')
  unique(contentPacks.map(({ name }) => name.toLocaleLowerCase()), 'Content pack names')
  unique(participants.map(({ name }) => name.toLocaleLowerCase()), 'Participant names')

  const preferences = validatePreferences(
    input.preferences,
    new Set(contentPacks.map(({ id }) => id)),
    new Set(participants.map(({ id }) => id)),
  )
  return {
    schemaVersion: LOCAL_BACKUP_SCHEMA_VERSION,
    routines,
    contentPacks,
    participants,
    preferences,
  }
}

export async function parseLocalBackupFile(
  file: Pick<File, 'text'>,
): Promise<LocalBackup> {
  let parsed: unknown
  try {
    parsed = JSON.parse(await file.text())
  } catch {
    throw new InvalidLocalBackupError('The backup file is not valid JSON.')
  }
  return validateLocalBackup(parsed)
}
