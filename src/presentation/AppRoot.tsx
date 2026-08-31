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

  useEffect(() => {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', activeTheme.preview.background)

    const existing = document.querySelector<HTMLLinkElement>(
      'link[data-wheel-theme-font]',
    )
    if (activeTheme.fontStylesheetUrl === undefined) {
      existing?.remove()
      return
    }
    if (existing?.href === activeTheme.fontStylesheetUrl) return

    const link = existing ?? document.createElement('link')
    link.rel = 'stylesheet'
    link.dataset.wheelThemeFont = activeTheme.id
    link.href = activeTheme.fontStylesheetUrl
    if (existing === null) document.head.append(link)
  }, [activeTheme])

  return (
    <ThemeProvider theme={activeTheme.theme}>
      <CssBaseline />
      <App
        timerSoundsEnabled={preferences.timerSoundsEnabled}
        themeId={preferences.themeId}
        onPreferencesChanged={setPreferences}
      />
    </ThemeProvider>
  )
}
