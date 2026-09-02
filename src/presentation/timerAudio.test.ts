import { describe, expect, it, vi } from 'vitest'
import { HtmlAudioPlayer, TIMER_CUE_ASSETS } from './timerAudio'

class FakeAudio extends EventTarget {
  src = ''
  preload = ''
  muted = false
  currentTime = 0
  readyState = 4
  load = vi.fn()
  pause = vi.fn()
  autoEnd = false
  play = vi.fn(async () => {
    if (this.autoEnd) queueMicrotask(() => this.dispatchEvent(new Event('ended')))
  })
}

const setup = () => {
  const elements: FakeAudio[] = []
  const revoked: string[] = []
  const configureAudioSession = vi.fn()
  const player = new HtmlAudioPlayer({
    createAudio: (src) => {
      const audio = new FakeAudio()
      audio.src = src ?? ''
      audio.autoEnd = src !== undefined
      elements.push(audio)
      return audio
    },
    createObjectUrl: () => 'blob:prepared',
    revokeObjectUrl: (url) => revoked.push(url),
    configureAudioSession,
  })
  const bySource = (source: string) =>
    elements.find((element) => element.src === source) as FakeAudio
  return { player, elements, bySource, revoked, configureAudioSession }
}

describe('HTML timer audio', () => {
  it('primes retained media elements and the playback session', async () => {
    const audio = setup()
    await audio.player.prime()
    expect(audio.configureAudioSession).toHaveBeenCalledOnce()
    expect(audio.elements.slice(0, 3).every((element) => element.preload === 'auto')).toBe(true)
    expect(audio.bySource(TIMER_CUE_ASSETS['countdown-1']).play).toHaveBeenCalledOnce()
  })

  it('maps countdown cues to their packaged assets in order', async () => {
    const audio = setup()
    const order: string[] = []
    for (const [name, source] of Object.entries(TIMER_CUE_ASSETS)) {
      audio.bySource(source).play.mockImplementation(async function (this: FakeAudio) {
        order.push(name)
        queueMicrotask(() => this.dispatchEvent(new Event('ended')))
      })
    }
    await audio.player.playCues([
      { kind: 'countdown', second: 3 },
      { kind: 'countdown', second: 2 },
      { kind: 'countdown', second: 1 },
    ])
    expect(order).toEqual(['countdown-3', 'countdown-2', 'countdown-1'])
  })

  it('stops an active sequence without playing its remaining cues', async () => {
    const audio = setup()
    const first = audio.bySource(TIMER_CUE_ASSETS['countdown-3'])
    const second = audio.bySource(TIMER_CUE_ASSETS['countdown-2'])
    first.autoEnd = false
    const playback = audio.player.playCues([
      { kind: 'countdown', second: 3 },
      { kind: 'countdown', second: 2 },
    ])
    await Promise.resolve()
    audio.player.stopCues()
    first.dispatchEvent(new Event('ended'))
    await playback
    expect(first.pause).toHaveBeenCalled()
    expect(second.play).not.toHaveBeenCalled()
  })

  it('gives an essential cue priority over prepared speech', async () => {
    const audio = setup()
    audio.player.prepareSpeech('work:1', new Blob(['audio']))
    await audio.player.playPreparedSpeech('work:1')
    await audio.player.playCues([{ kind: 'countdown', second: 1 }])
    expect(audio.elements.at(-1)?.pause).toHaveBeenCalled()
    expect(audio.revoked).toEqual(['blob:prepared'])
  })

  it('plays a ready prepared clip once and revokes it when it ends', async () => {
    const audio = setup()
    const speech = audio.elements.at(-1) as FakeAudio
    audio.player.prepareSpeech('work:1', new Blob(['audio']))
    await expect(audio.player.playPreparedSpeech('work:1')).resolves.toBe('started')
    speech.dispatchEvent(new Event('ended'))
    expect(audio.revoked).toEqual(['blob:prepared'])
    await expect(audio.player.playPreparedSpeech('work:1')).resolves.toBe('not-ready')
  })

  it('skips and revokes a target that is not media-ready', async () => {
    const audio = setup()
    const speech = audio.elements.at(-1) as FakeAudio
    speech.readyState = 0
    audio.player.prepareSpeech('work:1', new Blob(['audio']))
    await expect(audio.player.playPreparedSpeech('work:1')).resolves.toBe('not-ready')
    expect(speech.play).not.toHaveBeenCalled()
    expect(audio.revoked).toEqual(['blob:prepared'])
  })
})
