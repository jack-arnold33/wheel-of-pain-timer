import { ThemeProvider } from '@mui/material'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ContentPack } from '../domain/contentPacks/types'
import { builtInStarterPack } from '../domain/contentPacks/builtInContentPacks'
import {
  PERSONALITY_AUTHORING_DRAFT_KEY,
  emptyPersonalityAuthoringDraft,
  savePersonalityAuthoringDraft,
} from '../domain/contentPacks/personalityAuthoring'
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

afterEach(() => {
  cleanup()
  localStorage.clear()
})

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

  it('creates a categorized Personality from a pasted ChatGPT response', async () => {
    const onImport = vi.fn().mockResolvedValue({
      status: 'saved',
      pack,
    })
    render(
      <ThemeProvider theme={wheelOfPainTheme}>
        <ContentPackLibrary
          packs={[]}
          selectedId={null}
          onBack={vi.fn()}
          onSelect={vi.fn()}
          onImport={onImport}
          onReplace={vi.fn()}
          onRename={vi.fn()}
          onDelete={vi.fn()}
        />
      </ThemeProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Create Personality' }))
    fireEvent.change(screen.getByLabelText(/Personality name/u), {
      target: { value: 'Tuesday Chaos' },
    })
    fireEvent.change(screen.getByLabelText('Tone'), {
      target: { value: 'Dry and theatrical' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Copy prompt for ChatGPT' }))
    expect(
      (await screen.findByLabelText('AI prompt') as HTMLTextAreaElement).value,
    ).toContain('Dry and theatrical')

    fireEvent.change(screen.getByLabelText('Paste ChatGPT response'), {
      target: {
        value:
          '```json\n{"schemaVersion":1,"name":"Tuesday Chaos","sayings":{"work":["Go."],"cycleRest":["Breathe."],"finished":["Done."]}}\n```',
      },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Review sayings' }))

    expect(screen.getByRole('heading', { name: 'Review Personality' })).toBeInTheDocument()
    expect(screen.getByLabelText('During work sayings')).toHaveValue('• Go.')
    fireEvent.change(screen.getByLabelText('During work sayings'), {
      target: { value: '• Go.\n\n• Keep moving.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save & select' }))

    await waitFor(() =>
      expect(onImport).toHaveBeenCalledWith({
        schemaVersion: 1,
        name: 'Tuesday Chaos',
        sayings: {
          work: ['Go.', 'Keep moving.'],
          cycleRest: ['Breathe.'],
          finished: ['Done.'],
        },
        extensions: {},
      }),
    )
    expect(screen.getByRole('heading', { name: 'Personality' })).toBeInTheDocument()
  })

  it('recovers an unfinished creator draft after leaving the library', () => {
    const props = {
      packs: [],
      selectedId: null,
      onBack: vi.fn(),
      onSelect: vi.fn(),
      onImport: vi.fn(),
      onReplace: vi.fn(),
      onRename: vi.fn(),
      onDelete: vi.fn(),
    }
    const view = render(
      <ThemeProvider theme={wheelOfPainTheme}>
        <ContentPackLibrary {...props} />
      </ThemeProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Create Personality' }))
    fireEvent.change(screen.getByLabelText(/Personality name/u), {
      target: { value: 'Mobile Draft' },
    })
    view.unmount()
    render(
      <ThemeProvider theme={wheelOfPainTheme}>
        <ContentPackLibrary {...props} />
      </ThemeProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Create Personality' }))

    expect(screen.getByLabelText(/Personality name/u)).toHaveValue('Mobile Draft')
  })

  it('uses normal conflict resolution and clears a saved creator draft', async () => {
    savePersonalityAuthoringDraft({
      ...emptyPersonalityAuthoringDraft(),
      step: 'review',
      name: pack.name,
      sayings: {
        work: 'A replacement.',
        cycleRest: '',
        finished: '',
      },
    })
    const onImport = vi.fn().mockResolvedValue({ status: 'conflict', existing: pack })
    const onReplace = vi.fn().mockResolvedValue(undefined)
    render(
      <ThemeProvider theme={wheelOfPainTheme}>
        <ContentPackLibrary
          packs={[pack]}
          selectedId={pack.id}
          onBack={vi.fn()}
          onSelect={vi.fn()}
          onImport={onImport}
          onReplace={onReplace}
          onRename={vi.fn()}
          onDelete={vi.fn()}
        />
      </ThemeProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Create Personality' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save & select' }))
    expect(await screen.findByRole('heading', { name: 'Pack already exists' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Replace existing' }))

    await waitFor(() => expect(onReplace).toHaveBeenCalledWith(
      pack.id,
      expect.objectContaining({ name: pack.name, sayings: { work: ['A replacement.'] } }),
    ))
    await waitFor(() =>
      expect(localStorage.getItem(PERSONALITY_AUTHORING_DRAFT_KEY)).toBeNull(),
    )
  })
})
