import type { Theme } from '@mui/material/styles'
import { wheelOfPainTheme } from './wheelOfPainTheme'

export type ThemeId = 'wheel-of-pain'

export interface AppThemeDefinition {
  readonly id: ThemeId
  readonly name: string
  readonly theme: Theme
}

export const defaultThemeId: ThemeId = 'wheel-of-pain'

export const themeRegistry: Record<ThemeId, AppThemeDefinition> = {
  'wheel-of-pain': {
    id: 'wheel-of-pain',
    name: 'Wheel of Pain',
    theme: wheelOfPainTheme,
  },
}

export function resolveTheme(themeId: string | undefined): AppThemeDefinition {
  if (themeId !== undefined && themeId in themeRegistry) {
    return themeRegistry[themeId as ThemeId]
  }
  return themeRegistry[defaultThemeId]
}
