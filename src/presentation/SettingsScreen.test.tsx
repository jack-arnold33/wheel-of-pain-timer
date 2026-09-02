import { ThemeProvider } from '@mui/material'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LocalBackup } from '../domain/backup/localBackup'
import { defaultAppPreferences } from '../domain/preferences/appPreferences'
import { standardRoutineTiming } from '../domain/timer/standardRoutine'
import { SettingsScreen } from './SettingsScreen'
import { wheelOfPainTheme } from './themes/wheelOfPainTheme'

const speechMocks = vi.hoisted(() => ({
  primeSpokenMotivation: vi.fn(),
  speakMotivation: vi.fn(() => 'spoken' as const),
}))

const credentialMocks = vi.hoisted(() => ({
  status: vi.fn(async () => ({ configured: false, lastFour: undefined as string | undefined })),
  save: vi.fn(async () => ({ configured: true, lastFour: 'abcd' })),
  remove: vi.fn(async () => undefined),
}))

const onlineSpeechMocks = vi.hoisted(() => ({
  createOpenAiSpeech: vi.fn(async () => new Blob(['audio'], { type: 'audio/mpeg' })),
}))

const audioPlayerMocks = vi.hoisted(() => ({
  playSpeechPreview: vi.fn(async () => 'started' as const),
  cancelSpeech: vi.fn(),
}))

vi.mock('./spokenMotivation', () => speechMocks)
vi.mock('../data/openAiCredentialRepository', () => ({
  openAiCredentialRepository: credentialMocks,
}))
vi.mock('../services/openAiSpeech', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/openAiSpeech')>()),
  createOpenAiSpeech: onlineSpeechMocks.createOpenAiSpeech,
}))
vi.mock('./timerAudio', () => ({ appAudioPlayer: audioPlayerMocks }))

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

const backupHandlers = {
  onExportBackup: vi.fn().mockRejectedValue(new Error('not used')),
  onRestoreBackup: vi.fn().mockResolvedValue(undefined),
}

const localBackup: LocalBackup = {
  schemaVersion: 1,
  routines: [
    {
      id: 'routine:test',
      name: 'Test Routine',
      timing: standardRoutineTiming,
      createdAt: 1,
      updatedAt: 1,
    },
  ],
  contentPacks: [],
  participants: [
    { id: 'participant:test', name: 'Jarno', createdAt: 1, updatedAt: 1 },
  ],
  preferences: {
    ...defaultAppPreferences,
    activeParticipantIds: ['participant:test'],
  },
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
  credentialMocks.status.mockResolvedValue({ configured: false, lastFour: undefined })
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
          {...backupHandlers}
        />
      </ThemeProvider>,
    )

    expect(screen.getByRole('combobox', { name: 'Voice' })).toHaveTextContent(
      'System Default',
    )
    const sectionHeadings = screen.getAllByRole('heading', { level: 5 })
    expect(sectionHeadings[0]).toHaveTextContent('Appearance')
    expect(sectionHeadings[1]).toHaveTextContent('People')
    expect(sectionHeadings[2]).toHaveTextContent('Audio')

    fireEvent.click(screen.getByRole('switch', { name: 'Timer sounds' }))
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({ timerSoundsEnabled: false }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Fast' }))
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ speechRate: 1.25 }))

    fireEvent.click(screen.getByRole('button', { name: 'Preview device voice' }))
    expect(speechMocks.primeSpokenMotivation).toHaveBeenCalledOnce()
    expect(speechMocks.speakMotivation).toHaveBeenCalledWith(
      'The Wheel of Pain awaits.',
      { allowOnlineVoices: false, voiceId: null, rate: 1 },
    )
    expect(screen.getByText('2 saved')).toBeInTheDocument()
  })

  it('previews the selected Personality voice instructions online', async () => {
    credentialMocks.status.mockResolvedValue({ configured: true, lastFour: 'abcd' })
    render(
      <ThemeProvider theme={wheelOfPainTheme}>
        <SettingsScreen
          timerSoundsEnabled
          spokenMotivationEnabled
          allowOnlineVoices
          voiceId="alloy"
          speechRate={1}
          voiceInstructions="Sound dry, theatrical, and encouraging."
          participantCount={0}
          onBack={vi.fn()}
          onParticipants={vi.fn()}
          onChange={vi.fn()}
          {...backupHandlers}
        />
      </ThemeProvider>,
    )

    await screen.findByText(/ends in abcd/u)
    fireEvent.click(screen.getByRole('button', { name: 'Test TV-compatible voice' }))

    await waitFor(() =>
      expect(onlineSpeechMocks.createOpenAiSpeech).toHaveBeenCalledWith({
        text: 'The Wheel of Pain awaits.',
        voice: 'alloy',
        speed: 1,
        voiceInstructions: 'Sound dry, theatrical, and encouraging.',
      }),
    )
  })

  it('shows visual theme choices and persists the selected stable identifier', async () => {
    const onChange = vi.fn().mockResolvedValue(undefined)
    render(
      <ThemeProvider theme={wheelOfPainTheme}>
        <SettingsScreen
          themeId="wheel-of-pain"
          timerSoundsEnabled
          spokenMotivationEnabled
          allowOnlineVoices={false}
          voiceId={null}
          speechRate={1}
          participantCount={0}
          onBack={vi.fn()}
          onParticipants={vi.fn()}
          onChange={onChange}
          {...backupHandlers}
        />
      </ThemeProvider>,
    )

    expect(screen.getByRole('radio', { name: 'Use Wheel of Pain theme' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getAllByRole('radio', { name: /^Use .* theme$/ })).toHaveLength(4)
    fireEvent.click(screen.getByRole('radio', { name: 'Use Cold Steel theme' }))
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({ themeId: 'cold-steel' }),
    )
  })

  it('reports when an unavailable saved theme falls back safely', () => {
    render(
      <ThemeProvider theme={wheelOfPainTheme}>
        <SettingsScreen
          themeId="retired-theme"
          timerSoundsEnabled
          spokenMotivationEnabled
          allowOnlineVoices={false}
          voiceId={null}
          speechRate={1}
          participantCount={0}
          onBack={vi.fn()}
          onParticipants={vi.fn()}
          onChange={vi.fn().mockResolvedValue(undefined)}
          {...backupHandlers}
        />
      </ThemeProvider>,
    )

    expect(
      screen.getByText(
        'The saved appearance is unavailable. Wheel of Pain is being used instead.',
      ),
    ).toBeInTheDocument()
  })

  it('does not present browser online voices as TV-compatible choices', async () => {
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
          {...backupHandlers}
        />
      </ThemeProvider>,
    )

    expect(
      screen.getByText('No eligible on-device voice is currently exposed by this browser.'),
    ).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Voice' }))
    expect(
      screen.queryByRole('option', { name: /Online Voice/ }),
    ).not.toBeInTheDocument()
  })

  it('clears a selected online voice when device voice is selected', async () => {
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
          voiceId="alloy"
          speechRate={1}
          participantCount={0}
          onBack={vi.fn()}
          onParticipants={vi.fn()}
          onChange={onChange}
          {...backupHandlers}
        />
      </ThemeProvider>,
    )

    fireEvent.click(screen.getByRole('radio', { name: /Device voice/ }))
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({
        allowOnlineVoices: false,
        voiceId: null,
      }),
    )
  })

  it('reveals OpenAI key and consent controls only after TV voice is selected', async () => {
    const onChange = vi.fn().mockResolvedValue(undefined)
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
          onChange={onChange}
          {...backupHandlers}
        />
      </ThemeProvider>,
    )

    const onlineChoice = await screen.findByRole('radio', {
      name: /TV voice through OpenAI/,
    })
    expect(onlineChoice).toBeEnabled()
    expect(screen.queryByLabelText('OpenAI API key')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('checkbox', { name: /I understand this key/ }),
    ).not.toBeInTheDocument()

    fireEvent.click(onlineChoice)

    expect(screen.getByLabelText('OpenAI API key')).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: /I understand this key/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Enter and save an OpenAI API key below to continue.'),
    ).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('explains online speech before saving consent', async () => {
    credentialMocks.status.mockResolvedValue({ configured: true, lastFour: 'abcd' })
    const onChange = vi.fn().mockResolvedValue(undefined)
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
          onChange={onChange}
          {...backupHandlers}
        />
      </ThemeProvider>,
    )

    expect(
      screen.queryByText('Audio and voice choices stay on this device.'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(/An individual saying and the participant name/),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: /TV voice through OpenAI/ }))
    await screen.findByText(/ends in abcd/)
    fireEvent.click(screen.getByRole('button', { name: 'Enable TV voice' }))
    expect(
      screen.getByRole('heading', { name: 'Enable TV-compatible online voice?' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/One selected saying and the participant name/),
    ).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Enable online voice' }))
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({ allowOnlineVoices: true }),
    )
  })

  it('requires acknowledgement, stores only a redacted key status, and removes it', async () => {
    const onChange = vi.fn().mockResolvedValue(undefined)
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
          onChange={onChange}
          {...backupHandlers}
        />
      </ThemeProvider>,
    )

    fireEvent.click(await screen.findByRole('radio', { name: /TV voice through OpenAI/ }))
    const saveButton = screen.getByRole('button', { name: 'Save on this device' })
    expect(saveButton).toBeDisabled()
    fireEvent.change(screen.getByLabelText('OpenAI API key'), {
      target: { value: 'sk-proj-example-1234567890abcd' },
    })
    fireEvent.click(screen.getByRole('checkbox', { name: /I understand this key/ }))
    fireEvent.click(saveButton)

    await screen.findByText(/ends in abcd/)
    expect(credentialMocks.save).toHaveBeenCalledWith(
      'sk-proj-example-1234567890abcd',
    )
    expect(screen.queryByDisplayValue(/sk-proj/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Remove key' }))
    await waitFor(() => expect(credentialMocks.remove).toHaveBeenCalledOnce())
    expect(audioPlayerMocks.cancelSpeech).toHaveBeenCalled()
  })

  it('validates a backup before showing and confirming replacement', async () => {
    const onRestoreBackup = vi.fn().mockResolvedValue(undefined)
    const { container } = render(
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
          onExportBackup={vi.fn()}
          onRestoreBackup={onRestoreBackup}
        />
      </ThemeProvider>,
    )

    const input = container.querySelector<HTMLInputElement>('input[type="file"]')
    expect(input).not.toBeNull()
    fireEvent.change(input!, {
      target: {
        files: [
          new File([JSON.stringify(localBackup)], 'garage-backup.json', {
            type: 'application/json',
          }),
        ],
      },
    })

    expect(
      await screen.findByRole('heading', { name: 'Restore local backup?' }),
    ).toBeInTheDocument()
    expect(screen.getByText('1 user routines')).toBeInTheDocument()
    expect(screen.getByText('1 participants')).toBeInTheDocument()
    expect(onRestoreBackup).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Replace and restore' }))
    await waitFor(() => expect(onRestoreBackup).toHaveBeenCalledWith(localBackup))
  })
})
