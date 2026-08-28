import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppRoot } from './presentation/AppRoot'

const rootElement = document.getElementById('root')

if (rootElement === null) {
  throw new Error('Application root element was not found.')
}

createRoot(rootElement).render(
  <StrictMode>
    <AppRoot />
  </StrictMode>,
)
