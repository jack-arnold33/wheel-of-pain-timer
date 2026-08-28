import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { ThemeProvider } from '@mui/material'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { protectedStandardRoutine } from './domain/routines/protectedRoutine'
import type { Routine } from './domain/routines/types'
import { clearWorkoutCheckpoint } from './domain/timer/workoutPersistence'
import { wheelOfPainTheme } from './presentation/themes/wheelOfPainTheme'

vi.mock('./presentation/PwaUpdatePrompt', () => ({
  PwaUpdatePrompt: () => null,
}))

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
})

describe('App workout flow', () => {
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
