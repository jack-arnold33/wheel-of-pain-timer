import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ThemeProvider } from '@mui/material'
import { describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { wheelOfPainTheme } from './presentation/themes/wheelOfPainTheme'

vi.mock('./presentation/PwaUpdatePrompt', () => ({
  PwaUpdatePrompt: () => null,
}))

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
})
