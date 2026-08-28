import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { ThemeProvider } from '@mui/material'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { clearWorkoutCheckpoint } from './domain/timer/workoutPersistence'
import { wheelOfPainTheme } from './presentation/themes/wheelOfPainTheme'

vi.mock('./presentation/PwaUpdatePrompt', () => ({
  PwaUpdatePrompt: () => null,
}))

afterEach(() => {
  cleanup()
  clearWorkoutCheckpoint()
  Reflect.deleteProperty(navigator, 'wakeLock')
})

describe('App workout flow', () => {
  it('launches the protected routine and guards ending it', async () => {
    render(
      <ThemeProvider theme={wheelOfPainTheme}>
        <App />
      </ThemeProvider>,
    )

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

    render(
      <ThemeProvider theme={wheelOfPainTheme}>
        <App />
      </ThemeProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    await waitFor(() => expect(request).toHaveBeenCalledWith('screen'))

    fireEvent.click(screen.getByRole('button', { name: 'End workout' }))
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'End workout' }),
    )

    await waitFor(() => expect(release).toHaveBeenCalledOnce())
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument()
  })

  it('restores a paused workout after the application remounts', () => {
    const renderApp = () =>
      render(
        <ThemeProvider theme={wheelOfPainTheme}>
          <App />
        </ThemeProvider>,
      )

    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    cleanup()

    renderApp()

    expect(screen.getByRole('heading', { name: 'Prepare' })).toBeInTheDocument()
    expect(screen.getByText('Paused')).toBeInTheDocument()
    expect(
      screen.getByText('Workout restored after an interruption.'),
    ).toBeInTheDocument()
  })
})
