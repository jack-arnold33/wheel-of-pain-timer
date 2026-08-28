import { ThemeProvider } from '@mui/material'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SettingsScreen } from './SettingsScreen'
import { wheelOfPainTheme } from './themes/wheelOfPainTheme'

const speechMocks = vi.hoisted(() => ({
  primeSpokenMotivation: vi.fn(),
  speakMotivation: vi.fn(() => 'spoken' as const),
}))

vi.mock('./spokenMotivation', () => speechMocks)

const voice = (
  name: string,
  voiceURI: string,
  localService: boolean,
): SpeechSynthesisVoice =>
  ({
    default: name === 'Local Voice',
    lang: 'en-US',
    localService,
    name,
    voiceURI,
  }) as SpeechSynthesisVoice

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  Reflect.deleteProperty(window, 'speechSynthesis')
})

describe('SettingsScreen', () => {
  it('saves independent audio choices and previews only generic text', async () => {
    const voices = [
      voice('Local Voice', 'voice:local', true),
      voice('Online Voice', 'voice:online', false),
    ]
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        getVoices: () => voices,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    })
    const onChange = vi.fn().mockResolvedValue(undefined)

    render(
      <ThemeProvider theme={wheelOfPainTheme}>
        <SettingsScreen
          timerSoundsEnabled
          spokenMotivationEnabled
          allowOnlineVoices={false}
          voiceId={null}
          speechRate={1}
          participantCount={2}
          onBack={vi.fn()}
          onParticipants={vi.fn()}
          onChange={onChange}
        />
      </ThemeProvider>,
    )

    fireEvent.click(screen.getByRole('switch', { name: 'Timer sounds' }))
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({ timerSoundsEnabled: false }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Fast' }))
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ speechRate: 1.25 }))

    fireEvent.click(screen.getByRole('button', { name: 'Preview voice' }))
    expect(speechMocks.primeSpokenMotivation).toHaveBeenCalledOnce()
    expect(speechMocks.speakMotivation).toHaveBeenCalledWith(
      'The Wheel of Pain awaits.',
      { allowOnlineVoices: false, voiceId: null, rate: 1 },
    )
    expect(screen.getByText('2 saved')).toBeInTheDocument()
  })

  it('labels online voices and keeps them unavailable without consent', async () => {
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        getVoices: () => [voice('Online Voice', 'voice:online', false)],
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    })

    render(
      <ThemeProvider theme={wheelOfPainTheme}>
        <SettingsScreen
          timerSoundsEnabled
          spokenMotivationEnabled
          allowOnlineVoices={false}
          voiceId={null}
          speechRate={1}
          participantCount={0}
          onBack={vi.fn()}
          onParticipants={vi.fn()}
          onChange={vi.fn().mockResolvedValue(undefined)}
        />
      </ThemeProvider>,
    )

    expect(
      screen.getByText('No eligible on-device voice is currently exposed by this browser.'),
    ).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Voice' }))
    const onlineOption = await screen.findByRole('option', {
      name: 'Online Voice (en-US) · Online or unknown',
    })
    expect(onlineOption).toHaveAttribute('aria-disabled', 'true')
  })

  it('clears a selected online voice when consent is disabled', async () => {
    const online = voice('Online Voice', 'voice:online', false)
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        getVoices: () => [online],
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    })
    const onChange = vi.fn().mockResolvedValue(undefined)

    render(
      <ThemeProvider theme={wheelOfPainTheme}>
        <SettingsScreen
          timerSoundsEnabled
          spokenMotivationEnabled
          allowOnlineVoices
          voiceId={online.voiceURI}
          speechRate={1}
          participantCount={0}
          onBack={vi.fn()}
          onParticipants={vi.fn()}
          onChange={onChange}
        />
      </ThemeProvider>,
    )

    fireEvent.click(screen.getByRole('switch', { name: 'Allow online voices' }))
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({
        allowOnlineVoices: false,
        voiceId: null,
      }),
    )
  })
})
