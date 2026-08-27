import { describe, expect, it } from 'vitest'
import { defaultThemeId, resolveTheme, themeRegistry } from './registry'

describe('theme registry', () => {
  it('resolves the stable built-in theme identifier (A-009)', () => {
    expect(resolveTheme('wheel-of-pain')).toBe(themeRegistry['wheel-of-pain'])
  })

  it('falls back safely when a stored theme is unavailable (A-009)', () => {
    expect(resolveTheme('missing-theme')).toBe(themeRegistry[defaultThemeId])
  })
})
