import { afterEach, describe, expect, it } from 'vitest'
import {
  PERSONALITY_AUTHORING_DRAFT_KEY,
  authoringDraftFromPack,
  buildPersonalityBrief,
  buildPersonalityPrompt,
  contentPackFromAuthoringDraft,
  emptyPersonalityAuthoringDraft,
  loadPersonalityAuthoringDraft,
  parsePastedPersonality,
  savePersonalityAuthoringDraft,
} from './personalityAuthoring'
import { DEFAULT_VOICE_INSTRUCTIONS } from './validation'

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
    expect(prompt).toContain('"voiceInstructions"')
    expect(prompt).toContain('tone, energy, pacing, emphasis, and emotional style')
    expect(prompt).toContain('no more than 500 characters')
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

  it('builds a crew brief from only the selected reusable profiles', () => {
    const brief = buildPersonalityBrief(
      {
        ...emptyPersonalityAuthoringDraft(),
        mode: 'crew',
        name: 'Garage Regulars',
        selectedParticipantIds: ['participant:alex'],
      },
      [
        {
          id: 'participant:alex',
          name: 'Alexandra',
          spokenName: 'Alex',
          about: 'Always grabs the heaviest kettlebell.',
          motivationStyle: 'crew-default',
          avoid: 'Knee jokes',
          createdAt: 1,
          updatedAt: 1,
        },
        { id: 'participant:sam', name: 'Sam', createdAt: 1, updatedAt: 1 },
      ],
      {
        name: 'Tuesday Crew',
        about: 'We train before sunrise.',
        motivationStyle: 'playful',
        avoid: 'Age jokes',
      },
    )

    expect(brief).toContain('Crew name: Tuesday Crew')
    expect(brief).toContain('Crew motivation style: playful')
    expect(brief).toContain('Participant: Alexandra')
    expect(brief).toContain('Spoken name: Alex')
    expect(brief).toContain('Motivation style: playful')
    expect(brief).toContain('Knee jokes')
    expect(brief).not.toContain('Participant: Sam')
    expect(brief).toContain('The app reads these sayings exactly as written')
  })

  it('parses JSON copied with a Markdown fence', () => {
    const pack = parsePastedPersonality(
      'Here you go:\n```json\n{"schemaVersion":2,"name":"Phone Crew","voiceInstructions":"Sound playful and quick.","sayings":{"work":["Go."],"finished":["Done."]}}\n```',
      'Ignored fallback',
    )

    expect(pack).toEqual({
      schemaVersion: 2,
      addressingMode: 'participant-prefix',
      name: 'Phone Crew',
      voiceInstructions: 'Sound playful and quick.',
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
      '{\n&#x20; "schemaVersion": 2,\n&#32; "name": "Entity Copy",\n&nbsp; "sayings": {"work": ["Go."]}\n}',
      'Ignored fallback',
    )

    expect(pack).toMatchObject({
      name: 'Entity Copy',
      voiceInstructions: DEFAULT_VOICE_INSTRUCTIONS,
      sayings: { work: ['Go.'] },
    })
  })

  it('round-trips an editable categorized draft through pack validation', () => {
    const draft = authoringDraftFromPack(emptyPersonalityAuthoringDraft(), {
      schemaVersion: 2,
      name: 'Editable',
      addressingMode: 'participant-prefix',
      voiceInstructions: 'Sound dry and theatrical.',
      sayings: { work: ['First.', 'Second.'], cycleRest: ['Breathe.'] },
      extensions: {},
    })

    expect(draft.sayings.work).toBe('• First.\n\n• Second.')
    expect(draft.sayings.cycleRest).toBe('• Breathe.')
    expect(draft.voiceInstructions).toBe('Sound dry and theatrical.')

    expect(contentPackFromAuthoringDraft(draft)).toEqual({
      schemaVersion: 2,
      name: 'Editable',
      addressingMode: 'participant-prefix',
      voiceInstructions: 'Sound dry and theatrical.',
      sayings: { work: ['First.', 'Second.'], cycleRest: ['Breathe.'] },
      extensions: {},
    })
  })

  it('moves a legacy general-only paste into work for new authoring', () => {
    const draft = authoringDraftFromPack(emptyPersonalityAuthoringDraft(), {
      schemaVersion: 2,
      name: 'Legacy Paste',
      addressingMode: 'participant-prefix',
      voiceInstructions: DEFAULT_VOICE_INSTRUCTIONS,
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
