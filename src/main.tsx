import { CssBaseline, ThemeProvider } from '@mui/material'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { resolveTheme } from './presentation/themes/registry'

const activeTheme = resolveTheme(undefined)
const rootElement = document.getElementById('root')

if (rootElement === null) {
  throw new Error('Application root element was not found.')
}

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider theme={activeTheme.theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
)
