import type { Theme } from '@mui/material/styles'
import { coldSteelTheme } from './coldSteelTheme'
import { dayShiftTheme } from './dayShiftTheme'
import { neonCircuitTheme } from './neonCircuitTheme'
import { wheelOfPainTheme } from './wheelOfPainTheme'

export type ThemeId =
  | 'wheel-of-pain'
  | 'cold-steel'
  | 'neon-circuit'
  | 'day-shift'

export interface ThemePreview {
  readonly background: string
  readonly paper: string
  readonly primary: string
  readonly text: string
}

export interface AppThemeDefinition {
  readonly id: ThemeId
  readonly name: string
  readonly description: string
  readonly theme: Theme
  readonly preview: ThemePreview
  readonly fontStylesheetUrl?: string
}

export const defaultThemeId: ThemeId = 'wheel-of-pain'

export const themeRegistry: Record<ThemeId, AppThemeDefinition> = {
  'wheel-of-pain': {
    id: 'wheel-of-pain',
    name: 'Wheel of Pain',
    description: 'Warm bronze and charcoal with a rugged condensed face.',
    theme: wheelOfPainTheme,
    preview: {
      background: '#15110f',
      paper: '#28201b',
      primary: '#e8a126',
      text: '#fff4dc',
    },
  },
  'cold-steel': {
    id: 'cold-steel',
    name: 'Cold Steel',
    description: 'Industrial blue-black, steel gray, and ice blue.',
    theme: coldSteelTheme,
    preview: {
      background: '#0b1117',
      paper: '#17212b',
      primary: '#7dd3fc',
      text: '#f4f7fa',
    },
    fontStylesheetUrl:
      'https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@700;800;900&display=swap',
  },
  'neon-circuit': {
    id: 'neon-circuit',
    name: 'Neon Circuit',
    description: 'Electric cyan and magenta on deep indigo.',
    theme: neonCircuitTheme,
    preview: {
      background: '#090614',
      paper: '#17102b',
      primary: '#22d3ee',
      text: '#f7f3ff',
    },
    fontStylesheetUrl:
      'https://fonts.googleapis.com/css2?family=Oxanium:wght@600;700;800&display=swap',
  },
  'day-shift': {
    id: 'day-shift',
    name: 'Day Shift',
    description: 'Warm daylight surfaces with strong safety-red accents.',
    theme: dayShiftTheme,
    preview: {
      background: '#f7f1e6',
      paper: '#fffdf8',
      primary: '#b42318',
      text: '#211b17',
    },
    fontStylesheetUrl:
      'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap',
  },
}

export const availableThemes = Object.values(themeRegistry)

export function resolveTheme(themeId: string | undefined): AppThemeDefinition {
  if (themeId !== undefined && themeId in themeRegistry) {
    return themeRegistry[themeId as ThemeId]
  }
  return themeRegistry[defaultThemeId]
}
