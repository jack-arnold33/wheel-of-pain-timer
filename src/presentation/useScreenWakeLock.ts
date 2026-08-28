import { useCallback, useEffect, useRef, useState } from 'react'

export type WakeLockStatus =
  | 'inactive'
  | 'requesting'
  | 'active'
  | 'unavailable'
  | 'failed'

export function useScreenWakeLock(shouldHold: boolean): WakeLockStatus {
  const [status, setStatus] = useState<WakeLockStatus>('inactive')
  const sentinel = useRef<WakeLockSentinel | null>(null)
  const requestInFlight = useRef(false)
  const shouldHoldRef = useRef(shouldHold)

  useEffect(() => {
    shouldHoldRef.current = shouldHold
  }, [shouldHold])

  const requestLock = useCallback(async () => {
    await Promise.resolve()

    if (
      !shouldHoldRef.current ||
      document.visibilityState !== 'visible' ||
      sentinel.current !== null ||
      requestInFlight.current
    ) {
      return
    }

    if (!('wakeLock' in navigator)) {
      setStatus('unavailable')
      return
    }

    requestInFlight.current = true
    setStatus('requesting')

    try {
      const acquired = await navigator.wakeLock.request('screen')
      if (!shouldHoldRef.current) {
        await acquired.release()
        return
      }

      sentinel.current = acquired
      acquired.addEventListener('release', () => {
        if (sentinel.current === acquired) sentinel.current = null
        if (shouldHoldRef.current) setStatus('failed')
      })
      setStatus('active')
    } catch {
      if (shouldHoldRef.current) setStatus('failed')
    } finally {
      requestInFlight.current = false
    }
  }, [])

  useEffect(() => {
    if (!shouldHold) {
      const heldLock = sentinel.current
      sentinel.current = null
      if (heldLock !== null) void heldLock.release()
      return
    }

    const initialRequest = window.setTimeout(() => void requestLock(), 0)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void requestLock()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearTimeout(initialRequest)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      shouldHoldRef.current = false
      const heldLock = sentinel.current
      sentinel.current = null
      if (heldLock !== null) void heldLock.release()
    }
  }, [requestLock, shouldHold])

  return shouldHold ? status : 'inactive'
}

export function wakeLockNotice(status: WakeLockStatus): string | undefined {
  if (status === 'unavailable') {
    return 'Screen wake lock is unavailable. Keep your device awake manually.'
  }
  if (status === 'failed') {
    return 'The screen wake lock was released or denied. Keep your device awake manually.'
  }
  return undefined
}
