import { ThemeProvider } from '@mui/material'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ContentPack } from '../domain/contentPacks/types'
import { builtInStarterPack } from '../domain/contentPacks/builtInContentPacks'
import { ContentPackLibrary } from './ContentPackLibrary'
import { wheelOfPainTheme } from './themes/wheelOfPainTheme'

const pack: ContentPack = {
  id: 'pack:test',
  schemaVersion: 1,
  name: 'Tuesday Chaos',
  sayings: {
    general: ['Move.', 'Again.'],
    work: ['Go.'],
    finished: ['Done.'],
  },
  extensions: {},
  createdAt: 1,
  updatedAt: 1,
}

afterEach(cleanup)

describe('ContentPackLibrary', () => {
  it('offers the protected built-in starter personality', () => {
    render(
      <ThemeProvider theme={wheelOfPainTheme}>
        <ContentPackLibrary
          packs={[builtInStarterPack]}
          selectedId={null}
          onBack={vi.fn()}
          onSelect={vi.fn()}
          onImport={vi.fn()}
          onReplace={vi.fn()}
          onRename={vi.fn()}
          onDelete={vi.fn()}
        />
      </ThemeProvider>,
    )

    expect(screen.getByRole('button', { name: 'Select Workout Starter' })).toBeInTheDocument()
    expect(screen.getByText('Built in')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Inspect Workout Starter' }))
    expect(screen.getByText('Included with the app')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rename' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument()
  })

  it('inspects category totals, renames, and removes a saved pack', async () => {
    const renamed = { ...pack, name: 'Friday Fire', updatedAt: 2 }
    const onRename = vi.fn().mockResolvedValue(renamed)
    const onDelete = vi.fn().mockResolvedValue(undefined)
    render(
      <ThemeProvider theme={wheelOfPainTheme}>
        <ContentPackLibrary
          packs={[pack]}
          selectedId={pack.id}
          onBack={vi.fn()}
          onSelect={vi.fn()}
          onImport={vi.fn()}
          onReplace={vi.fn()}
          onRename={onRename}
          onDelete={onDelete}
        />
      </ThemeProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Inspect Tuesday Chaos' }))
    expect(screen.getByRole('heading', { name: '4 sayings' })).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }))
    fireEvent.change(screen.getByLabelText('Pack name'), {
      target: { value: 'Friday Fire' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(onRename).toHaveBeenCalledWith(pack.id, 'Friday Fire'),
    )
    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { name: 'Rename content pack' }),
      ).not.toBeInTheDocument(),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Inspect Tuesday Chaos' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(
      screen.getByRole('heading', { name: 'Remove Tuesday Chaos?' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Remove pack' }))
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(pack.id))
  })
})
