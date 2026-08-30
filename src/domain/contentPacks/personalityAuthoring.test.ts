import { afterEach, describe, expect, it } from 'vitest'
import {
  PERSONALITY_AUTHORING_DRAFT_KEY,
  authoringDraftFromPack,
  buildPersonalityPrompt,
  contentPackFromAuthoringDraft,
  emptyPersonalityAuthoringDraft,
  loadPersonalityAuthoringDraft,
  parsePastedPersonality,
  savePersonalityAuthoringDraft,
} from './personalityAuthoring'

afterEach(() => localStorage.clear())

describe('Personality authoring', () => {
  it('builds an exact, context-aware prompt without participant placeholders', () => {
    const prompt = buildPersonalityPrompt({
      ...emptyPersonalityAuthoringDraft(),
      name: 'Tuesday Chaos',
      tone: 'Dry and theatrical',
      themes: 'The ceremonial kettlebell',
      avoid: 'Comments about appearance',
    })

    expect(prompt).toContain('"name": "Tuesday Chaos"')
    expect(prompt).toContain('Tone: Dry and theatrical')
    expect(prompt).toContain('Themes, recurring jokes, or group context: The ceremonial kettlebell')
    expect(prompt).toContain('Avoid: Comments about appearance')
    expect(prompt).toContain('Do not include participant names or name placeholders')
    expect(prompt).toContain('Return a raw JSON object, not a quoted or escaped JSON string')
    expect(prompt).toContain('Do not add backslashes at line endings')
    expect(prompt).toContain('Use ordinary spaces, not HTML entities')
    expect(prompt).toContain('Include both closing braces')
    expect(prompt).toContain('Return exactly one fenced code block marked json')
    expect(prompt).toContain('```json\n{')
    expect(prompt).toContain('}\n```')
    expect(prompt).toContain('response must consist only of that code block')
    expect(prompt).not.toContain('Do not include explanations or code fences')
    expect(prompt).not.toContain('"general"')
    expect(prompt).not.toContain('general sayings')
  })

  it('parses JSON copied with a Markdown fence', () => {
    const pack = parsePastedPersonality(
      'Here you go:\n```json\n{"schemaVersion":1,"name":"Phone Crew","sayings":{"work":["Go."],"finished":["Done."]}}\n```',
      'Ignored fallback',
    )

    expect(pack).toEqual({
      schemaVersion: 1,
      name: 'Phone Crew',
      sayings: { work: ['Go.'], finished: ['Done.'] },
      extensions: {},
    })
  })

  it('accepts plain pasted lines as work sayings', () => {
    expect(parsePastedPersonality('Move.\nAgain.\n', 'Quick Pack')).toMatchObject({
      name: 'Quick Pack',
      sayings: { work: ['Move.', 'Again.'] },
    })
  })

  it('normalizes HTML whitespace entities introduced while copying JSON', () => {
    const pack = parsePastedPersonality(
      '{\n&#x20; "schemaVersion": 1,\n&#32; "name": "Entity Copy",\n&nbsp; "sayings": {"work": ["Go."]}\n}',
      'Ignored fallback',
    )

    expect(pack).toMatchObject({
      name: 'Entity Copy',
      sayings: { work: ['Go.'] },
    })
  })

  it('round-trips an editable categorized draft through pack validation', () => {
    const draft = authoringDraftFromPack(emptyPersonalityAuthoringDraft(), {
      schemaVersion: 1,
      name: 'Editable',
      sayings: { work: ['First.', 'Second.'], cycleRest: ['Breathe.'] },
      extensions: {},
    })

    expect(draft.sayings.work).toBe('• First.\n\n• Second.')
    expect(draft.sayings.cycleRest).toBe('• Breathe.')

    expect(contentPackFromAuthoringDraft(draft)).toEqual({
      schemaVersion: 1,
      name: 'Editable',
      sayings: { work: ['First.', 'Second.'], cycleRest: ['Breathe.'] },
      extensions: {},
    })
  })

  it('moves a legacy general-only paste into work for new authoring', () => {
    const draft = authoringDraftFromPack(emptyPersonalityAuthoringDraft(), {
      schemaVersion: 1,
      name: 'Legacy Paste',
      sayings: { general: ['Keep moving.'] },
      extensions: {},
    })

    expect(draft.sayings).toEqual({
      work: '• Keep moving.',
      cycleRest: '',
      finished: '',
    })
  })

  it('persists an unfinished mobile draft and recovers it safely', () => {
    const draft = {
      ...emptyPersonalityAuthoringDraft(),
      name: 'Survives App Switching',
      response: '{"unfinished":true}',
    }
    savePersonalityAuthoringDraft(draft)

    expect(localStorage.getItem(PERSONALITY_AUTHORING_DRAFT_KEY)).not.toBeNull()
    expect(loadPersonalityAuthoringDraft()).toEqual(draft)

    localStorage.setItem(PERSONALITY_AUTHORING_DRAFT_KEY, '{')
    expect(loadPersonalityAuthoringDraft()).toEqual(emptyPersonalityAuthoringDraft())
  })
})
