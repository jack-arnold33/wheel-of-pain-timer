import { createTheme, type PaletteMode } from '@mui/material/styles'

interface AppThemeOptions {
  readonly mode: PaletteMode
  readonly primary: string
  readonly primaryContrast: string
  readonly secondary: string
  readonly background: string
  readonly paper: string
  readonly text: string
  readonly textSecondary: string
  readonly displayFontFamily: string
  readonly borderRadius: number
}

export function createAppTheme(options: AppThemeOptions) {
  const displayTypography = {
    fontFamily: options.displayFontFamily,
    fontWeight: 800,
    letterSpacing: '0.035em',
  }

  return createTheme({
    cssVariables: true,
    palette: {
      mode: options.mode,
      primary: {
        main: options.primary,
        contrastText: options.primaryContrast,
      },
      secondary: { main: options.secondary },
      background: {
        default: options.background,
        paper: options.paper,
      },
      text: {
        primary: options.text,
        secondary: options.textSecondary,
      },
    },
    typography: {
      fontFamily:
        'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      h1: {
        ...displayTypography,
        fontWeight: 900,
        textTransform: 'uppercase',
      },
      h2: displayTypography,
      h3: displayTypography,
      h4: displayTypography,
      h5: displayTypography,
      h6: displayTypography,
      button: {
        fontFamily: options.displayFontFamily,
        fontWeight: 800,
        letterSpacing: '0.025em',
      },
    },
    shape: { borderRadius: options.borderRadius },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '@media (prefers-reduced-motion: reduce)': {
            '*, *::before, *::after': {
              animationDuration: '0.01ms !important',
              animationIterationCount: '1 !important',
              scrollBehavior: 'auto !important',
              transitionDuration: '0.01ms !important',
            },
          },
        },
      },
      MuiButtonBase: {
        styleOverrides: {
          root: {
            '&.Mui-focusVisible': {
              outline: '3px solid var(--mui-palette-primary-main)',
              outlineOffset: 2,
            },
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { minHeight: 48 } },
      },
    },
  })
}
