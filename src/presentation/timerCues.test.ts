import { describe, expect, it } from 'vitest'
import type { TimerCueFrame } from './timerCues'
import { timerCuesBetween } from './timerCues'

const frame = (
  remainingMs: number,
  observedAtMs: number,
  overrides: Partial<TimerCueFrame> = {},
): TimerCueFrame => ({
  status: 'running',
  phaseIndex: 0,
  remainingMs,
  elapsedInPhaseMs: 10_000 - remainingMs,
  observedAtMs,
  ...overrides,
})

describe('timer cues', () => {
  it.each([3, 2, 1])('produces one cue at %i seconds', (second) => {
    expect(
      timerCuesBetween(
        frame((second + 1) * 1_000, 0),
        frame(second * 1_000, 100),
      ),
    ).toEqual([{ kind: 'countdown', second }])
  })

  it('does not cue outside the final three seconds or repeat a second', () => {
    expect(timerCuesBetween(frame(5_000, 0), frame(4_000, 100))).toEqual([])
    expect(timerCuesBetween(frame(4_900, 0), frame(4_100, 100))).toEqual([])
  })

  it('plays no separate transition sound and starts a short phase countdown', () => {
    expect(
      timerCuesBetween(
        frame(100, 0),
        frame(3_000, 100, {
          phaseIndex: 1,
          elapsedInPhaseMs: 0,
        }),
      ),
    ).toEqual([{ kind: 'countdown', second: 3 }])
  })

  it('stays silent at a normal phase boundary', () => {
    expect(
      timerCuesBetween(
        frame(100, 0),
        frame(10_000, 100, {
          phaseIndex: 1,
          elapsedInPhaseMs: 0,
        }),
      ),
    ).toEqual([])
  })

  it('does not replay cues after a suspended observation gap', () => {
    expect(
      timerCuesBetween(
        frame(6_000, 0),
        frame(2_000, 5_000),
      ),
    ).toEqual([])
    expect(
      timerCuesBetween(
        frame(100, 0),
        frame(10_000, 5_000, { phaseIndex: 2 }),
      ),
    ).toEqual([])
  })

  it('stays silent while paused', () => {
    expect(
      timerCuesBetween(
        frame(5_100, 0),
        frame(5_000, 100, { status: 'paused' }),
      ),
    ).toEqual([])
  })
})
