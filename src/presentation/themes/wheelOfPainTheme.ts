import { createTheme } from '@mui/material/styles'

export const wheelOfPainTheme = createTheme({
  cssVariables: true,
  palette: {
    mode: 'dark',
    primary: {
      main: '#e8a126',
      contrastText: '#15110f',
    },
    secondary: {
      main: '#bc6a3c',
    },
    background: {
      default: '#15110f',
      paper: '#28201b',
    },
    text: {
      primary: '#fff4dc',
      secondary: '#d9c8aa',
    },
  },
  typography: {
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: {
      fontWeight: 900,
      letterSpacing: '0.035em',
      textTransform: 'uppercase',
    },
    button: {
      fontWeight: 800,
    },
  },
  shape: {
    borderRadius: 8,
  },
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
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          minHeight: 48,
        },
      },
    },
  },
})
