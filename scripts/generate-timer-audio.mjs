import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const sampleRate = 44_100
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputDirectory = resolve(root, 'src/assets/audio')

const cues = {
  'countdown-3.wav': {
    durationSeconds: 0.16,
    tones: [{ frequency: 700, gain: 0.62, offsetSeconds: 0, durationSeconds: 0.16 }],
  },
  'countdown-2.wav': {
    durationSeconds: 0.18,
    tones: [{ frequency: 880, gain: 0.7, offsetSeconds: 0, durationSeconds: 0.18 }],
  },
  'countdown-1.wav': {
    durationSeconds: 0.26,
    tones: [
      { frequency: 1_100, gain: 0.76, offsetSeconds: 0, durationSeconds: 0.26 },
      { frequency: 1_650, gain: 0.18, offsetSeconds: 0, durationSeconds: 0.2 },
    ],
  },
  'transition.wav': {
    durationSeconds: 0.45,
    tones: [
      { frequency: 880, gain: 0.75, offsetSeconds: 0, durationSeconds: 0.16 },
      { frequency: 1_760, gain: 0.14, offsetSeconds: 0, durationSeconds: 0.13 },
      { frequency: 1_320, gain: 0.85, offsetSeconds: 0.17, durationSeconds: 0.28 },
      { frequency: 2_640, gain: 0.1, offsetSeconds: 0.17, durationSeconds: 0.22 },
    ],
  },
}

const envelope = (elapsed, duration) => {
  const attack = Math.min(1, elapsed / 0.01)
  const release = Math.min(1, Math.max(0, duration - elapsed) / 0.035)
  return Math.min(attack, release)
}

const render = ({ durationSeconds, tones }) => {
  const sampleCount = Math.ceil(durationSeconds * sampleRate)
  const dataSize = sampleCount * 2
  const buffer = Buffer.alloc(44 + dataSize)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)

  for (let index = 0; index < sampleCount; index += 1) {
    const at = index / sampleRate
    let sample = 0
    for (const tone of tones) {
      const elapsed = at - tone.offsetSeconds
      if (elapsed < 0 || elapsed >= tone.durationSeconds) continue
      sample +=
        Math.sin(2 * Math.PI * tone.frequency * elapsed) *
        tone.gain *
        envelope(elapsed, tone.durationSeconds)
    }
    const limited = Math.tanh(sample) * 0.92
    buffer.writeInt16LE(Math.round(limited * 32_767), 44 + index * 2)
  }
  return buffer
}

await mkdir(outputDirectory, { recursive: true })
await Promise.all(
  Object.entries(cues).map(([name, cue]) =>
    writeFile(resolve(outputDirectory, name), render(cue)),
  ),
)
