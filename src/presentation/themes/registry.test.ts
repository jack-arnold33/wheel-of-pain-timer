import { describe, expect, it } from 'vitest'
import {
  availableThemes,
  defaultThemeId,
  resolveTheme,
  themeRegistry,
} from './registry'

describe('theme registry', () => {
  it('resolves the stable built-in theme identifier (A-009)', () => {
    expect(resolveTheme('wheel-of-pain')).toBe(themeRegistry['wheel-of-pain'])
  })

  it('falls back safely when a stored theme is unavailable (A-009)', () => {
    expect(resolveTheme('missing-theme')).toBe(themeRegistry[defaultThemeId])
  })

  it('provides stable definitions and previews for every built-in theme', () => {
    expect(availableThemes.map(({ id }) => id)).toEqual([
      'wheel-of-pain',
      'cold-steel',
      'neon-circuit',
      'day-shift',
    ])
    for (const definition of availableThemes) {
      expect(resolveTheme(definition.id)).toBe(definition)
      expect(definition.preview.primary).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})
