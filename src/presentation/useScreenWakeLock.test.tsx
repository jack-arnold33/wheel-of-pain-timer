import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useScreenWakeLock, wakeLockNotice } from './useScreenWakeLock'

function makeSentinel() {
  const target = new EventTarget()
  const release = vi.fn(async () => {
    target.dispatchEvent(new Event('release'))
  })
  const sentinel = Object.assign(target, {
    released: false,
    type: 'screen',
    release,
  }) as unknown as WakeLockSentinel
  return { release, sentinel }
}

function setWakeLock(request: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, 'wakeLock', {
    configurable: true,
    value: { request },
  })
}

function setVisibility(value: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value,
  })
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'wakeLock')
  Reflect.deleteProperty(document, 'visibilityState')
})

describe('useScreenWakeLock', () => {
  it('holds the screen lock until the workout lifecycle ends', async () => {
    const { release, sentinel } = makeSentinel()
    const request = vi.fn().mockResolvedValue(sentinel)
    setWakeLock(request)
    setVisibility('visible')

    const { result, rerender } = renderHook(
      ({ active }) => useScreenWakeLock(active),
      { initialProps: { active: true } },
    )

    await waitFor(() => expect(result.current).toBe('active'))
    expect(request).toHaveBeenCalledWith('screen')

    rerender({ active: false })
    await waitFor(() => expect(result.current).toBe('inactive'))
    expect(release).toHaveBeenCalledOnce()
  })

  it('reacquires the lock after returning to the foreground', async () => {
    const first = makeSentinel()
    const second = makeSentinel()
    const request = vi.fn()
      .mockResolvedValueOnce(first.sentinel)
      .mockResolvedValueOnce(second.sentinel)
    setWakeLock(request)
    setVisibility('visible')

    const { result } = renderHook(() => useScreenWakeLock(true))
    await waitFor(() => expect(result.current).toBe('active'))

    setVisibility('hidden')
    act(() => first.sentinel.dispatchEvent(new Event('release')))
    expect(result.current).toBe('failed')

    setVisibility('visible')
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(result.current).toBe('active'))
  })

  it('reports unsupported browsers without blocking the workout', async () => {
    setVisibility('visible')
    const { result } = renderHook(() => useScreenWakeLock(true))

    await waitFor(() => expect(result.current).toBe('unavailable'))
    expect(wakeLockNotice(result.current)).toContain('unavailable')
  })
})
