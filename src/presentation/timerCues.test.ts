import { describe, expect, it } from 'vitest'
import type { TimerCueFrame } from './timerCues'
import { TimerCueScheduler, timerCuesBetween } from './timerCues'

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
  it('produces one transition cue at three seconds', () => {
    expect(
      timerCuesBetween(
        frame(3_100, 0),
        frame(3_000, 100),
      ),
    ).toEqual([{ kind: 'transition' }])
  })

  it('does not cue outside the threshold or repeat within the last three seconds', () => {
    expect(timerCuesBetween(frame(5_000, 0), frame(4_000, 100))).toEqual([])
    expect(timerCuesBetween(frame(3_000, 0), frame(2_000, 100))).toEqual([])
  })

  it('cues a newly started three-second phase for its upcoming transition', () => {
    expect(
      timerCuesBetween(
        frame(100, 0),
        frame(3_000, 100, {
          phaseIndex: 1,
          elapsedInPhaseMs: 0,
        }),
      ),
    ).toEqual([{ kind: 'transition' }])
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

  it.each([
    [600, 2_500],
    [1_000, 2_000],
    [2_000, 1_000],
  ])('still cues after a %i ms delayed observation while the warning is useful', (
    observationGapMs,
    remainingMs,
  ) => {
    expect(
      timerCuesBetween(
        frame(3_100, 0),
        frame(remainingMs, observationGapMs),
      ),
    ).toEqual([{ kind: 'transition' }])
  })

  it('does not play a stale warning with less than one second remaining', () => {
    expect(
      timerCuesBetween(
        frame(3_100, 0),
        frame(900, 2_200),
      ),
    ).toEqual([])
  })

  it('does not infer a crossed threshold when the clock moves backward', () => {
    expect(timerCuesBetween(frame(3_100, 100), frame(2_900, 0))).toEqual([])
  })

  it('delivers at most one transition cue per phase', () => {
    const scheduler = new TimerCueScheduler(frame(3_100, 0))

    expect(scheduler.cuesAt(frame(2_000, 1_100))).toEqual([{ kind: 'transition' }])
    expect(scheduler.cuesAt(frame(1_900, 1_200, { status: 'paused' }))).toEqual([])
    expect(scheduler.cuesAt(frame(1_800, 1_300))).toEqual([])
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
