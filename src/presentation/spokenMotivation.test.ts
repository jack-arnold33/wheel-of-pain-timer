import { describe, expect, it, vi } from 'vitest'
import {
  primeSpokenMotivation,
  speakMotivation,
  type MotivationSpeechOptions,
} from './spokenMotivation'

const voice = (
  voiceURI: string,
  localService: boolean,
  isDefault = false,
) =>
  ({
    voiceURI,
    name: voiceURI,
    lang: 'en-US',
    localService,
    default: isDefault,
  }) as SpeechSynthesisVoice

const options: MotivationSpeechOptions = {
  allowOnlineVoices: false,
  voiceId: null,
  rate: 1,
}

const environment = (voices: SpeechSynthesisVoice[]) => {
  const speak = vi.fn()
  const resume = vi.fn()
  return {
    value: {
      synthesis: { getVoices: () => voices, speak, resume },
      createUtterance: (text: string) =>
        ({ text, voice: null, lang: '', rate: 1 }) as SpeechSynthesisUtterance,
    },
    speak,
    resume,
  }
}

describe('spoken motivation privacy policy', () => {
  it('uses an on-device default and applies the configured rate', () => {
    const local = voice('local', true, true)
    const speech = environment([voice('online', false), local])
    expect(speakMotivation('Jarno! Move.', { ...options, rate: 1.25 }, speech.value)).toBe(
      'spoken',
    )
    const utterance = speech.speak.mock.calls[0][0] as SpeechSynthesisUtterance
    expect(utterance).toMatchObject({
      text: 'Jarno! Move.',
      voice: local,
      lang: 'en-US',
      rate: 1.25,
    })
  })

  it('fails closed rather than sending text to an online voice', () => {
    const speech = environment([voice('online', false, true)])
    expect(speakMotivation('Private saying', options, speech.value)).toBe(
      'no-eligible-voice',
    )
    expect(speech.speak).not.toHaveBeenCalled()
  })

  it('uses a specifically selected online voice only after opt-in', () => {
    const online = voice('online', false)
    const speech = environment([online])
    expect(
      speakMotivation(
        'Allowed saying',
        { ...options, allowOnlineVoices: true, voiceId: online.voiceURI },
        speech.value,
      ),
    ).toBe('spoken')
    expect(speech.speak).toHaveBeenCalledOnce()
  })

  it('falls back to an eligible local default when a selected voice disappears', () => {
    const local = voice('local-default', true, true)
    const speech = environment([local])
    expect(
      speakMotivation(
        'Fallback saying',
        { ...options, voiceId: 'missing-voice' },
        speech.value,
      ),
    ).toBe('spoken-with-fallback')
    expect(speech.speak.mock.calls[0][0]).toMatchObject({ voice: local })
  })

  it('primes speech without throwing when a browser rejects resume', () => {
    const speech = environment([])
    speech.resume.mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => primeSpokenMotivation(speech.value)).not.toThrow()
  })
})
