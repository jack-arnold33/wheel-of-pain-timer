import { describe, expect, it } from 'vitest'
import { importContentPackFile } from './importContentPack'
import { InvalidContentPackError, MAX_CONTENT_PACK_BYTES } from './validation'

const sourceFile = (name: string, contents: string, size = contents.length) => ({
  name,
  size,
  text: async () => contents,
})

describe('content-pack import', () => {
  it('normalizes a plain-text filename, lines, and duplicates', async () => {
    const pack = await importContentPackFile(
      sourceFile(
        'tuesday-chaos.txt',
        ' Prepare your excuses. \n\nForm first.\nPrepare your excuses.\n',
      ),
    )

    expect(pack).toEqual({
      schemaVersion: 1,
      name: 'Tuesday Chaos',
      sayings: {
        general: ['Prepare your excuses.', 'Form first.'],
      },
      extensions: {},
    })
  })

  it('normalizes structured categories and retains unknown top-level fields', async () => {
    const pack = await importContentPackFile(
      sourceFile(
        'crew.timerpack.json',
        JSON.stringify({
          schemaVersion: 1,
          name: ' Crew ',
          sayings: { work: [' Go! ', 'Go!'], finished: ['Done.'] },
          author: 'Local user',
        }),
      ),
    )

    expect(pack).toEqual({
      schemaVersion: 1,
      name: 'Crew',
      sayings: { work: ['Go!'], finished: ['Done.'] },
      extensions: { author: 'Local user' },
    })
  })

  it.each([
    ['oversized file', sourceFile('large.txt', 'x', MAX_CONTENT_PACK_BYTES + 1), '512 KB'],
    ['invalid JSON', sourceFile('bad.timerpack.json', '{'), 'JSON is invalid'],
    [
      'unknown category',
      sourceFile(
        'bad.timerpack.json',
        JSON.stringify({
          schemaVersion: 1,
          name: 'Bad',
          sayings: { surprise: ['Nope'] },
        }),
      ),
      'Unknown saying category',
    ],
    [
      'empty sayings',
      sourceFile(
        'empty.timerpack.json',
        JSON.stringify({ schemaVersion: 1, name: 'Empty', sayings: { work: [' '] } }),
      ),
      'at least one',
    ],
  ])('rejects an actionable %s without producing a pack', async (_label, file, message) => {
    await expect(importContentPackFile(file)).rejects.toThrow(message)
    await expect(importContentPackFile(file)).rejects.toBeInstanceOf(
      InvalidContentPackError,
    )
  })

  it('rejects sayings beyond the documented character limit', async () => {
    await expect(
      importContentPackFile(
        sourceFile(
          'long.timerpack.json',
          JSON.stringify({
            schemaVersion: 1,
            name: 'Long',
            sayings: { general: ['x'.repeat(241)] },
          }),
        ),
      ),
    ).rejects.toThrow('240-character limit')
  })
})

