import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { WheelOfPainDatabase } from './database'
import { OpenAiCredentialRepository } from './openAiCredentialRepository'

const databases: WheelOfPainDatabase[] = []

const setup = () => {
  const database = new WheelOfPainDatabase(`credential-test-${crypto.randomUUID()}`)
  databases.push(database)
  return { database, repository: new OpenAiCredentialRepository(database) }
}

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.delete()))
  await Dexie.waitFor(Promise.resolve())
})

describe('OpenAiCredentialRepository', () => {
  it('stores only a dedicated credential record and exposes a redacted status', async () => {
    const { database, repository } = setup()
    await expect(repository.save('sk-proj-example-1234567890abcd')).resolves.toEqual({
      configured: true,
      lastFour: 'abcd',
    })
    await expect(repository.status()).resolves.toEqual({
      configured: true,
      lastFour: 'abcd',
    })
    expect(await database.preferences.count()).toBe(0)
    await expect(repository.readForOpenAiRequest()).resolves.toBe(
      'sk-proj-example-1234567890abcd',
    )
  })

  it('replaces and removes a key without retaining the previous value', async () => {
    const { repository } = setup()
    await repository.save('sk-proj-example-1234567890abcd')
    await repository.save('sk-proj-example-0987654321wxyz')
    await expect(repository.readForOpenAiRequest()).resolves.toBe(
      'sk-proj-example-0987654321wxyz',
    )
    await repository.remove()
    await expect(repository.status()).resolves.toEqual({ configured: false })
    await expect(repository.readForOpenAiRequest()).resolves.toBeUndefined()
  })

  it('rejects malformed values before writing', async () => {
    const { repository } = setup()
    await expect(repository.save('short key')).rejects.toThrow(
      'Enter a valid OpenAI project API key.',
    )
    await expect(repository.status()).resolves.toEqual({ configured: false })
  })
})
