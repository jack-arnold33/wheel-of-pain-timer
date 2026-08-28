import { CssBaseline, ThemeProvider } from '@mui/material'
import { useEffect, useState } from 'react'
import { App } from '../App'
import { defaultAppPreferences } from '../domain/preferences/appPreferences'
import { resolveTheme } from './themes/registry'

export function AppRoot() {
  const [preferences, setPreferences] = useState(defaultAppPreferences)

  useEffect(() => {
    let active = true
    void import('../data/preferencesRepository')
      .then(({ preferencesRepository }) => preferencesRepository.get())
      .then((stored) => {
        if (active) setPreferences(stored)
      })
      .catch(() => {
        // IndexedDB failure leaves the app usable with safe defaults.
      })
    return () => {
      active = false
    }
  }, [])

  const activeTheme = resolveTheme(preferences.themeId)
  return (
    <ThemeProvider theme={activeTheme.theme}>
      <CssBaseline />
      <App timerSoundsEnabled={preferences.timerSoundsEnabled} />
    </ThemeProvider>
  )
}
