import { afterEach, describe, expect, it, vi } from 'vitest'

interface FakeAudioParam {
  setValueAtTime: ReturnType<typeof vi.fn>
  exponentialRampToValueAtTime: ReturnType<typeof vi.fn>
}

const installAudioContext = () => {
  const frequencies: number[] = []
  const peakGains: number[] = []
  const durations: number[] = []

  class FakeAudioContext {
    state = 'running'
    currentTime = 10
    destination = {}
    resume = vi.fn()

    createOscillator() {
      const frequency = {
        setValueAtTime: vi.fn((value: number) => frequencies.push(value)),
      }
      let startsAt = 0
      return {
        type: 'sine',
        frequency,
        connect: vi.fn(),
        start: vi.fn((at: number) => { startsAt = at }),
        stop: vi.fn((at: number) => durations.push(at - startsAt)),
      }
    }

    createGain() {
      const gain: FakeAudioParam = {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn((value: number) => {
          if (value > 0.001) peakGains.push(value)
        }),
      }
      return { gain, connect: vi.fn() }
    }
  }

  Object.defineProperty(window, 'AudioContext', {
    configurable: true,
    value: FakeAudioContext,
  })
  return { frequencies, peakGains, durations }
}

afterEach(() => {
  vi.resetModules()
  Reflect.deleteProperty(navigator, 'audioSession')
  Reflect.deleteProperty(window, 'AudioContext')
})

describe('timer audio', () => {
  it('selects the iPhone playback session when audio is primed', async () => {
    const audioSession = { type: 'auto' }
    Object.defineProperty(navigator, 'audioSession', {
      configurable: true,
      value: audioSession,
    })

    const { primeTimerAudio } = await import('./timerAudio')
    primeTimerAudio()

    expect(audioSession.type).toBe('playback')
  })

  it('remains usable when the browser has no audio-session API', async () => {
    const { primeTimerAudio } = await import('./timerAudio')

    expect(() => primeTimerAudio()).not.toThrow()
  })

  it('uses a louder ascending countdown with a distinctive final warning', async () => {
    const audio = installAudioContext()
    const { playTimerCues } = await import('./timerAudio')

    playTimerCues([
      { kind: 'countdown', second: 3 },
      { kind: 'countdown', second: 2 },
      { kind: 'countdown', second: 1 },
    ])

    expect(audio.frequencies).toEqual([700, 880, 1_100, 1_650])
    expect(audio.peakGains).toEqual([0.38, 0.44, 0.52, 0.18])
    expect(audio.durations).toHaveLength(4)
    expect(audio.durations[0]).toBeCloseTo(0.16)
    expect(audio.durations[1]).toBeCloseTo(0.18)
    expect(audio.durations[2]).toBeCloseTo(0.26)
    expect(audio.durations[3]).toBeCloseTo(0.2)
  })

  it('uses a strong two-tone transition cue', async () => {
    const audio = installAudioContext()
    const { playTimerCues } = await import('./timerAudio')

    playTimerCues([{ kind: 'transition' }])

    expect(audio.frequencies).toEqual([880, 1_320])
    expect(audio.peakGains).toEqual([0.48, 0.56])
    expect(audio.durations).toHaveLength(2)
    expect(audio.durations[0]).toBeCloseTo(0.13)
    expect(audio.durations[1]).toBeCloseTo(0.2)
  })
})
