import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { vi } from 'vitest'

Object.defineProperties(HTMLMediaElement.prototype, {
  load: { configurable: true, value: vi.fn() },
  pause: { configurable: true, value: vi.fn() },
  play: { configurable: true, value: vi.fn(async () => undefined) },
})
