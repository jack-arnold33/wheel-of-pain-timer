import { ThemeProvider } from '@mui/material'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Participant } from '../domain/participants/types'
import { ParticipantAttendance } from './ParticipantAttendance'
import { wheelOfPainTheme } from './themes/wheelOfPainTheme'

afterEach(cleanup)

describe('ParticipantAttendance', () => {
  it('adds a new participant as active', async () => {
    const created: Participant = {
      id: 'participant:new',
      name: 'Jarno',
      createdAt: 1,
      updatedAt: 1,
    }
    const onAdd = vi.fn().mockResolvedValue(created)
    const { rerender } = render(
      <ThemeProvider theme={wheelOfPainTheme}>
        <ParticipantAttendance
          participants={[]}
          activeIds={[]}
          onBack={vi.fn()}
          onSave={vi.fn()}
          onAdd={onAdd}
          onRename={vi.fn()}
          onDelete={vi.fn()}
        />
      </ThemeProvider>,
    )

    fireEvent.change(screen.getByLabelText('New participant'), {
      target: { value: 'Jarno' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    await waitFor(() => expect(onAdd).toHaveBeenCalledWith('Jarno'))

    rerender(
      <ThemeProvider theme={wheelOfPainTheme}>
        <ParticipantAttendance
          participants={[created]}
          activeIds={[created.id]}
          onBack={vi.fn()}
          onSave={vi.fn()}
          onAdd={onAdd}
          onRename={vi.fn()}
          onDelete={vi.fn()}
        />
      </ThemeProvider>,
    )
    expect(screen.getByRole('checkbox', { name: 'Jarno' })).toBeChecked()
    expect(
      screen.getByRole('button', { name: 'Save attendance · 1 active' }),
    ).toBeInTheDocument()
  })
})

