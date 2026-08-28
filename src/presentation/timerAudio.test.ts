import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.resetModules()
  Reflect.deleteProperty(navigator, 'audioSession')
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
})
