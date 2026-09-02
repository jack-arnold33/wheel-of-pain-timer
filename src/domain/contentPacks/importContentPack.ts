import {
  CONTENT_PACK_SCHEMA_VERSION,
  type ContentPackDraft,
} from './types'
import {
  InvalidContentPackError,
  MAX_CONTENT_PACK_BYTES,
  normalizeContentPack,
  normalizeContentPackName,
  normalizeSayings,
  DEFAULT_VOICE_INSTRUCTIONS,
} from './validation'

export interface ContentPackSourceFile {
  readonly name: string
  readonly size: number
  text(): Promise<string>
}

const titleFromFilename = (filename: string) => {
  const stem = filename.replace(/\.txt$/i, '').trim()
  const words = stem
    .split(/[-_\s]+/u)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
  return normalizeContentPackName(words.join(' '))
}

export async function importContentPackFile(
  file: ContentPackSourceFile,
): Promise<ContentPackDraft> {
  if (file.size > MAX_CONTENT_PACK_BYTES) {
    throw new InvalidContentPackError('The source file exceeds the 512 KB limit.')
  }

  let text: string
  try {
    text = (await file.text()).replace(/^\uFEFF/u, '')
  } catch {
    throw new InvalidContentPackError('The source file could not be read as UTF-8 text.')
  }

  if (/\.txt$/i.test(file.name) && !/\.timerpack\.json$/i.test(file.name)) {
    return {
      schemaVersion: CONTENT_PACK_SCHEMA_VERSION,
      name: titleFromFilename(file.name),
      voiceInstructions: DEFAULT_VOICE_INSTRUCTIONS,
      sayings: normalizeSayings({ general: text.split(/\r?\n/u) }),
      extensions: {},
    }
  }

  if (!/\.timerpack\.json$/i.test(file.name)) {
    throw new InvalidContentPackError(
      'Choose a .txt or .timerpack.json content-pack file.',
    )
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new InvalidContentPackError('The content-pack JSON is invalid.')
  }
  return normalizeContentPack(parsed)
}

