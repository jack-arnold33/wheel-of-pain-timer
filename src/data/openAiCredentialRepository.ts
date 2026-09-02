import {
  OPENAI_CREDENTIAL_ID,
  appDatabase,
  type WheelOfPainDatabase,
} from './database'

export interface OpenAiCredentialStatus {
  readonly configured: boolean
  readonly lastFour?: string
}

const normalizeKey = (value: string) => {
  const apiKey = value.trim()
  if (apiKey.length < 20 || apiKey.length > 512 || /\s/.test(apiKey)) {
    throw new Error('Enter a valid OpenAI project API key.')
  }
  return apiKey
}

export class OpenAiCredentialRepository {
  constructor(
    private readonly database: WheelOfPainDatabase = appDatabase,
  ) {}

  async status(): Promise<OpenAiCredentialStatus> {
    const record = await this.database.credentials.get(OPENAI_CREDENTIAL_ID)
    return record === undefined
      ? { configured: false }
      : { configured: true, lastFour: record.lastFour }
  }

  async save(value: string): Promise<OpenAiCredentialStatus> {
    const apiKey = normalizeKey(value)
    const lastFour = apiKey.slice(-4)
    await this.database.credentials.put({
      id: OPENAI_CREDENTIAL_ID,
      apiKey,
      lastFour,
      updatedAt: Date.now(),
    })
    return { configured: true, lastFour }
  }

  async remove(): Promise<void> {
    await this.database.credentials.delete(OPENAI_CREDENTIAL_ID)
  }

  async readForOpenAiRequest(): Promise<string | undefined> {
    return (await this.database.credentials.get(OPENAI_CREDENTIAL_ID))?.apiKey
  }
}

export const openAiCredentialRepository = new OpenAiCredentialRepository()
