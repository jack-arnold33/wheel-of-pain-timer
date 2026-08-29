import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { ThemeProvider } from '@mui/material'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { protectedStandardRoutine } from './domain/routines/protectedRoutine'
import type { Routine } from './domain/routines/types'
import type { ContentPack } from './domain/contentPacks/types'
import type { Participant } from './domain/participants/types'
import { defaultAppPreferences } from './domain/preferences/appPreferences'
import { clearWorkoutCheckpoint } from './domain/timer/workoutPersistence'
import { wheelOfPainTheme } from './presentation/themes/wheelOfPainTheme'

const speechMocks = vi.hoisted(() => ({
  primeSpokenMotivation: vi.fn(),
  speakMotivation: vi.fn(() => 'spoken'),
}))

vi.mock('./presentation/PwaUpdatePrompt', () => ({
  PwaUpdatePrompt: () => null,
}))

vi.mock('./presentation/spokenMotivation', () => speechMocks)

const loadRoutines = () => Promise.resolve([protectedStandardRoutine])

const renderApp = () =>
  render(
    <ThemeProvider theme={wheelOfPainTheme}>
      <App loadRoutines={loadRoutines} />
    </ThemeProvider>,
  )

const openProtectedRoutine = async () => {
  await screen.findByRole('heading', { name: 'Routines' })
  fireEvent.click(
    screen.getByRole('button', { name: 'Review Wheel of Pain' }),
  )
}

afterEach(() => {
  cleanup()
  clearWorkoutCheckpoint()
  Reflect.deleteProperty(navigator, 'wakeLock')
  speechMocks.primeSpokenMotivation.mockClear()
  speechMocks.speakMotivation.mockClear()
})

describe('App workout flow', () => {
  it('opens device settings from Home and persists audio changes', async () => {
    const updatePreferences = vi.fn().mockImplementation(async (patch) => ({
      ...defaultAppPreferences,
      ...patch,
    }))
    render(
      <ThemeProvider theme={wheelOfPainTheme}>
        <App
          loadRoutines={loadRoutines}
          loadContentPacks={() =>
            Promise.resolve({
              packs: [],
              selectedId: null,
              timerSoundsEnabled: true,
            })
          }
          updatePreferences={updatePreferences}
        />
      </ThemeProvider>,
    )

    await screen.findByRole('heading', { name: 'Routines' })
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('switch', { name: 'Timer sounds' }))

    await waitFor(() =>
      expect(updatePreferences).toHaveBeenCalledWith({ timerSoundsEnabled: false }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('heading', { name: 'Routines' })).toBeInTheDocument()
  })

  it('speaks the selected Personality with the active participant snapshot', async () => {
    const quickRoutine: Routine = {
      id: 'routine:spoken',
      ownership: 'user',
      name: 'Spoken Test',
      createdAt: 1,
      updatedAt: 1,
      timing: {
        prepareSeconds: 0,
        workSeconds: 10,
        exerciseRestSeconds: 0,
        exercisesPerRound: 1,
        roundsPerCycle: 1,
        cycles: 1,
        cycleRestSeconds: 0,
        cooldownSeconds: 0,
      },
    }
    const pack: ContentPack = {
      id: 'pack:spoken',
      schemaVersion: 1,
      name: 'Spoken Pack',
      sayings: { work: ['Move now.'] },
      extensions: {},
      createdAt: 1,
      updatedAt: 1,
    }
    const jarno: Participant = {
      id: 'participant:jarno',
      name: 'Jarno',
      createdAt: 1,
      updatedAt: 1,
    }
    render(
      <ThemeProvider theme={wheelOfPainTheme}>
        <App
          loadRoutines={() => Promise.resolve([protectedStandardRoutine, quickRoutine])}
          loadContentPacks={() =>
            Promise.resolve({ packs: [pack], selectedId: pack.id })
          }
          loadParticipants={() =>
            Promise.resolve({ participants: [jarno], activeIds: [jarno.id] })
          }
        />
      </ThemeProvider>,
    )

    await screen.findByRole('heading', { name: 'Routines' })
    fireEvent.click(screen.getByRole('button', { name: 'Review Spoken Test' }))
    fireEvent.click(screen.getByRole('button', { name: 'Play' }))

    expect(speechMocks.primeSpokenMotivation).toHaveBeenCalledOnce()
    await waitFor(() =>
      expect(speechMocks.speakMotivation).toHaveBeenCalledWith(
        'Jarno! Move now.',
        expect.objectContaining({ allowOnlineVoices: false, rate: 1 }),
      ),
    )
  })

  it('remembers the active participant checklist for pre-workout', async () => {
    const jarno: Participant = {
      id: 'participant:jarno',
      name: 'Jarno',
      createdAt: 1,
      updatedAt: 1,
    }
    const casey: Participant = {
      id: 'participant:casey',
      name: 'Casey',
      createdAt: 1,
      updatedAt: 1,
    }
    const saveAttendance = vi
      .fn()
      .mockImplementation(async (ids: readonly string[]) => ids)
    render(
      <ThemeProvider theme={wheelOfPainTheme}>
        <App
          loadRoutines={loadRoutines}
          loadParticipants={() =>
            Promise.resolve({
              participants: [jarno, casey],
              activeIds: [jarno.id],
            })
          }
          saveAttendance={saveAttendance}
        />
      </ThemeProvider>,
    )

    await openProtectedRoutine()
    expect(screen.getByText('1 active')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Choose Participants' }))
    expect(
      await screen.findByRole('heading', { name: 'Participants' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Jarno' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Casey' })).not.toBeChecked()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Casey' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save attendance · 2 active' }))

    await waitFor(() =>
      expect(saveAttendance).toHaveBeenCalledWith([jarno.id, casey.id]),
    )
    expect(screen.getByRole('heading', { name: 'Wheel of Pain' })).toBeInTheDocument()
    expect(screen.getByText('2 active')).toBeInTheDocument()
  })

  it('selects a saved Personality and returns to the same pre-workout screen', async () => {
    const pack: ContentPack = {
      id: 'pack:chaos',
      schemaVersion: 1,
      name: 'Tuesday Chaos',
      sayings: { general: ['Move.'], work: ['Go.'] },
      extensions: {},
      createdAt: 1,
      updatedAt: 1,
    }
    const selectContentPack = vi.fn().mockResolvedValue(undefined)
    render(
      <ThemeProvider theme={wheelOfPainTheme}>
        <App
          loadRoutines={loadRoutines}
          loadContentPacks={() => Promise.resolve({ packs: [pack], selectedId: null })}
          selectContentPack={selectContentPack}
        />
      </ThemeProvider>,
    )

    await openProtectedRoutine()
    fireEvent.click(screen.getByRole('button', { name: 'Choose Personality' }))
    expect(
      await screen.findByRole('heading', { name: 'Personality' }),
    ).toBeInTheDocument()
    expect(screen.getByText('2 sayings · saved on this device')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Select Tuesday Chaos' }))

    await waitFor(() => expect(selectContentPack).toHaveBeenCalledWith(pack.id))
    expect(screen.getByRole('heading', { name: 'Wheel of Pain' })).toBeInTheDocument()
    expect(screen.getByText('Tuesday Chaos')).toBeInTheDocument()
  })

  it('imports a plain-text pack locally and selects it automatically', async () => {
    const imported: ContentPack = {
      id: 'pack:phone',
      schemaVersion: 1,
      name: 'Phone Fun',
      sayings: { general: ['Keep moving.'] },
      extensions: {},
      createdAt: 1,
      updatedAt: 1,
    }
    const importContentPack = vi.fn().mockResolvedValue(imported)
    const { container } = render(
      <ThemeProvider theme={wheelOfPainTheme}>
        <App
          loadRoutines={loadRoutines}
          loadContentPacks={() => Promise.resolve({ packs: [], selectedId: null })}
          importContentPack={importContentPack}
        />
      </ThemeProvider>,
    )

    await openProtectedRoutine()
    fireEvent.click(screen.getByRole('button', { name: 'Choose Personality' }))
    await screen.findByRole('heading', { name: 'Personality' })
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')
    expect(input).not.toBeNull()
    const file = new File(['Keep moving.\n'], 'phone-fun.txt', { type: 'text/plain' })
    fireEvent.change(input!, { target: { files: [file] } })

    await waitFor(() =>
      expect(importContentPack).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Phone Fun',
          sayings: { general: ['Keep moving.'] },
        }),
      ),
    )
    expect(screen.getByRole('heading', { name: 'Wheel of Pain' })).toBeInTheDocument()
    expect(screen.getByText('Phone Fun')).toBeInTheDocument()
  })

  it('customizes the protected preset as a validated saved copy', async () => {
    const createRoutine = vi.fn(async (input) => ({
      ...input,
      id: 'routine:custom',
      ownership: 'user' as const,
      createdAt: 1,
      updatedAt: 1,
    }))
    render(
      <ThemeProvider theme={wheelOfPainTheme}>
        <App loadRoutines={loadRoutines} createRoutine={createRoutine} />
      </ThemeProvider>,
    )

    await openProtectedRoutine()
    fireEvent.click(screen.getByRole('button', { name: 'Customize' }))

    expect(
      await screen.findByRole('heading', { name: 'Customize routine' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Routine name')).toHaveValue('Wheel of Pain Copy')

    fireEvent.change(screen.getByLabelText('Work'), {
      target: { value: '00:00' },
    })
    expect(screen.getByRole('button', { name: 'Save routine' })).toBeDisabled()
    expect(
      screen.getByText('Work duration must be a whole number from 1 to 3,599 seconds.'),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Routine name'), {
      target: { value: 'My Wheel' },
    })
    fireEvent.change(screen.getByLabelText('Work'), {
      target: { value: '00:45' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save routine' }))

    await waitFor(() => expect(createRoutine).toHaveBeenCalledOnce())
    expect(createRoutine).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'My Wheel',
        timing: expect.objectContaining({ workSeconds: 45 }),
      }),
    )
    expect(screen.getByRole('heading', { name: 'My Wheel' })).toBeInTheDocument()
    expect(screen.getByText('Saved on this device')).toBeInTheDocument()
  })

  it('edits and deletes a saved routine with named confirmation', async () => {
    const savedRoutine: Routine = {
      id: 'routine:saved',
      ownership: 'user',
      name: 'Saved Wheel',
      createdAt: 1,
      updatedAt: 1,
      timing: protectedStandardRoutine.timing,
    }
    const updatedRoutine = { ...savedRoutine, name: 'Updated Wheel', updatedAt: 2 }
    const updateRoutine = vi.fn().mockResolvedValue(updatedRoutine)
    const deleteRoutine = vi.fn().mockResolvedValue(undefined)
    render(
      <ThemeProvider theme={wheelOfPainTheme}>
        <App
          loadRoutines={() => Promise.resolve([protectedStandardRoutine, savedRoutine])}
          updateRoutine={updateRoutine}
          deleteRoutine={deleteRoutine}
        />
      </ThemeProvider>,
    )

    await screen.findByRole('heading', { name: 'Routines' })
    fireEvent.click(screen.getByRole('button', { name: 'Review Saved Wheel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    await screen.findByRole('heading', { name: 'Edit routine' })
    fireEvent.change(screen.getByLabelText('Routine name'), {
      target: { value: 'Updated Wheel' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save routine' }))

    await waitFor(() => expect(updateRoutine).toHaveBeenCalledOnce())
    expect(screen.getByRole('heading', { name: 'Updated Wheel' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(
      screen.getByRole('heading', { name: 'Delete Updated Wheel?' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Delete routine' }))

    await waitFor(() => expect(deleteRoutine).toHaveBeenCalledWith(savedRoutine.id))
    expect(
      await screen.findByRole('heading', { name: 'Routines' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Review Updated Wheel' }),
    ).not.toBeInTheDocument()
  })

  it('keeps the protected preset usable when saved routines cannot load', async () => {
    render(
      <ThemeProvider theme={wheelOfPainTheme}>
        <App loadRoutines={() => Promise.reject(new Error('storage unavailable'))} />
      </ThemeProvider>,
    )

    await screen.findByRole('heading', { name: 'Routines' })
    expect(
      screen.getByText(
        'Saved routines are unavailable on this device. The protected preset remains usable.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Review Wheel of Pain' }),
    ).toBeInTheDocument()
  })

  it('lists a saved routine and starts its configured sequence', async () => {
    const quickRoutine: Routine = {
      id: 'routine:quick',
      ownership: 'user',
      name: 'Quick Test',
      createdAt: 1,
      updatedAt: 1,
      timing: {
        prepareSeconds: 0,
        workSeconds: 10,
        exerciseRestSeconds: 0,
        exercisesPerRound: 1,
        roundsPerCycle: 1,
        cycles: 1,
        cycleRestSeconds: 0,
        cooldownSeconds: 0,
      },
    }
    render(
      <ThemeProvider theme={wheelOfPainTheme}>
        <App loadRoutines={() => Promise.resolve([protectedStandardRoutine, quickRoutine])} />
      </ThemeProvider>,
    )

    await screen.findByRole('heading', { name: 'Routines' })
    fireEvent.click(screen.getByRole('button', { name: 'Review Quick Test' }))
    expect(screen.getByRole('heading', { name: 'Quick Test' })).toBeInTheDocument()
    expect(screen.getByText('Saved on this device')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Play' }))

    expect(screen.getByRole('heading', { name: 'Work' })).toBeInTheDocument()
    expect(screen.getByLabelText('Time remaining')).toHaveTextContent('00:10')
  })

  it('launches the protected routine and guards ending it', async () => {
    renderApp()

    await openProtectedRoutine()
    expect(screen.getByRole('heading', { name: 'Wheel of Pain' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Play' }))

    expect(screen.getByRole('heading', { name: 'Prepare' })).toBeInTheDocument()
    expect(screen.getByLabelText('Time remaining')).toHaveTextContent('00:10')

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    expect(screen.getByText('Paused')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'End workout' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Keep workout paused' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText('Paused')).toBeInTheDocument()
  })

  it('releases the screen wake lock when ending a workout', async () => {
    const release = vi.fn().mockResolvedValue(undefined)
    const request = vi.fn().mockResolvedValue({
      released: false,
      type: 'screen',
      release,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request },
    })

    renderApp()

    await openProtectedRoutine()
    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    await waitFor(() => expect(request).toHaveBeenCalledWith('screen'))

    fireEvent.click(screen.getByRole('button', { name: 'End workout' }))
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'End workout' }),
    )

    await waitFor(() => expect(release).toHaveBeenCalledOnce())
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument()
  })

  it('restores a paused workout after the application remounts', async () => {
    renderApp()
    await openProtectedRoutine()
    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    cleanup()

    renderApp()

    expect(
      await screen.findByRole('heading', { name: 'Prepare' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Paused')).toBeInTheDocument()
    expect(
      screen.getByText('Workout restored after an interruption.'),
    ).toBeInTheDocument()
  })
})
