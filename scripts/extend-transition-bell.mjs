import { readFileSync, writeFileSync } from 'node:fs'

const source = new URL('../src/assets/audio/transition-bell.wav', import.meta.url)
const destination = new URL('../src/assets/audio/transition-bell-extended.wav', import.meta.url)
const sourceWav = readFileSync(source)

if (
  sourceWav.toString('ascii', 0, 4) !== 'RIFF' ||
  sourceWav.toString('ascii', 8, 12) !== 'WAVE' ||
  sourceWav.toString('ascii', 12, 16) !== 'fmt ' ||
  sourceWav.toString('ascii', 36, 40) !== 'data' ||
  sourceWav.readUInt16LE(20) !== 1 ||
  sourceWav.readUInt16LE(22) !== 2 ||
  sourceWav.readUInt16LE(34) !== 16
) {
  throw new Error('Expected a 44-byte stereo, 16-bit PCM WAV source')
}

const sampleRate = sourceWav.readUInt32LE(24)
const bytesPerFrame = 4
const sourceFrames = sourceWav.readUInt32LE(40) / bytesPerFrame
const echoDelayFrames = Math.round(sampleRate * 0.6)
const outputFrames = sourceFrames + echoDelayFrames
const outputWav = Buffer.alloc(44 + outputFrames * bytesPerFrame)
sourceWav.copy(outputWav, 0, 0, 44)
outputWav.writeUInt32LE(outputWav.length - 8, 4)
outputWav.writeUInt32LE(outputFrames * bytesPerFrame, 40)

for (let frame = 0; frame < outputFrames; frame += 1) {
  const tailFade = Math.min(1, (outputFrames - 1 - frame) / (sampleRate * 0.08))
  for (let channel = 0; channel < 2; channel += 1) {
    const sampleAt = (sourceFrame) =>
      sourceFrame >= 0 && sourceFrame < sourceFrames
        ? sourceWav.readInt16LE(44 + sourceFrame * bytesPerFrame + channel * 2)
        : 0
    const original = sampleAt(frame)
    const echo = sampleAt(frame - echoDelayFrames) * 0.65
    const mixed = Math.round((original + echo) * tailFade)
    outputWav.writeInt16LE(Math.max(-32768, Math.min(32767, mixed)),
      44 + frame * bytesPerFrame + channel * 2)
  }
}

writeFileSync(destination, outputWav)
process.stdout.write(`Generated ${destination.pathname}: ${(outputFrames / sampleRate).toFixed(3)} s\n`)
