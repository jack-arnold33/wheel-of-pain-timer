import { ThemeProvider } from '@mui/material'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ContentPack } from '../domain/contentPacks/types'
import { PersonalityPicker } from './PersonalityPicker'
import { wheelOfPainTheme } from './themes/wheelOfPainTheme'

const pack: ContentPack = {
  id: 'pack:test',
  schemaVersion: 1,
  name: 'Tuesday Chaos',
  voiceInstructions: 'Sound dry and theatrical.',
  sayings: { general: ['Move.'], work: ['Go.'] },
  extensions: {},
  createdAt: 1,
  updatedAt: 1,
}

afterEach(cleanup)

describe('PersonalityPicker', () => {
  it('only offers available Personalities and None', async () => {
    const onSelect = vi.fn().mockResolvedValue(undefined)
    render(
      <ThemeProvider theme={wheelOfPainTheme}>
        <PersonalityPicker
          packs={[pack]}
          selectedId={null}
          onBack={vi.fn()}
          onSelect={onSelect}
        />
      </ThemeProvider>,
    )

    expect(screen.getByRole('heading', { name: 'Choose Personality' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create Personality' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Import file' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Select Tuesday Chaos' }))
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith(pack.id))
  })

  it('can turn motivational sayings off for the workout', async () => {
    const onSelect = vi.fn().mockResolvedValue(undefined)
    render(
      <ThemeProvider theme={wheelOfPainTheme}>
        <PersonalityPicker
          packs={[pack]}
          selectedId={pack.id}
          onBack={vi.fn()}
          onSelect={onSelect}
        />
      </ThemeProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: /None/u }))
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith(null))
  })
})
