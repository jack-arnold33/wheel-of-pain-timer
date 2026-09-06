import { describe, expect, it, vi } from 'vitest'
import type { ContentPack } from '../domain/contentPacks/types'
import { MotivationSession } from '../domain/motivation/session'
import { buildWorkoutSequence } from '../domain/timer/sequence'
import { OnlineMotivationController, motivationTargets } from './onlineMotivation'
import type { AudioPlaybackResult } from './timerAudio'

const phases = buildWorkoutSequence({
  prepareSeconds: 5,
  workSeconds: 10,
  exerciseRestSeconds: 5,
  exercisesPerRound: 1,
  roundsPerCycle: 1,
  cycles: 2,
  cycleRestSeconds: 5,
  cooldownSeconds: 5,
})

const pack: ContentPack = {
  id: 'test',
  schemaVersion: 1,
  name: 'Test',
  voiceInstructions: 'Sound calm but firm.',
  sayings: { work: ['Work.'], cycleRest: ['Rest.'], finished: ['Done.'] },
  extensions: {},
  createdAt: 1,
  updatedAt: 1,
}

const flush = () => new Promise((resolve) => window.setTimeout(resolve, 0))

const setup = () => {
  const player = {
    prepareSpeech: vi.fn(),
    playPreparedSpeech: vi.fn<() => Promise<AudioPlaybackResult>>(async () => 'started'),
    cancelSpeech: vi.fn(),
  }
  const request = vi.fn(async () => new Blob(['audio'], { type: 'audio/mpeg' }))
  const onError = vi.fn()
  const controller = new OnlineMotivationController(
    phases,
    new MotivationSession(pack, [], () => 0),
    { voice: 'alloy', speed: 1, voiceInstructions: pack.voiceInstructions },
    onError,
    player,
    request,
  )
  return { controller, player, request, onError }
}

describe('online motivation preparation', () => {
  it('lists work, cycle-rest, and completion targets in sequence order', () => {
    expect(motivationTargets(phases).map(({ category }) => category)).toEqual([
      'work',
      'cycleRest',
      'work',
      'finished',
    ])
  })

  it('prepares one event ahead and advances after consumption', async () => {
    const speech = setup()
    speech.controller.startAt(0)
    await flush()
    expect(speech.request).toHaveBeenCalledTimes(1)
    expect(speech.request).toHaveBeenCalledWith(
      expect.objectContaining({ voiceInstructions: pack.voiceInstructions }),
    )
    expect(speech.player.prepareSpeech).toHaveBeenCalledWith(
      expect.stringMatching(/^phase:/),
      expect.any(Blob),
    )

    const firstTarget = motivationTargets(phases)[0]
    await expect(speech.controller.arrive(firstTarget.id)).resolves.toBe('started')
    await flush()
    expect(speech.request).toHaveBeenCalledTimes(2)
  })

  it('skips an unready zero-Prepare target and never late-prepares it', async () => {
    let resolveRequest: ((blob: Blob) => void) | undefined
    const speech = setup()
    speech.player.playPreparedSpeech.mockResolvedValue('not-ready')
    speech.request.mockImplementationOnce(
      () => new Promise<Blob>((resolve) => { resolveRequest = resolve }),
    )
    const firstTarget = motivationTargets(phases)[0]
    speech.controller.startAt(firstTarget.phaseIndex)
    await speech.controller.arrive(firstTarget.id)
    resolveRequest?.(new Blob(['late']))
    await flush()
    expect(speech.player.prepareSpeech).not.toHaveBeenCalledWith(
      firstTarget.id,
      expect.any(Blob),
    )
  })

  it('cancels stale work and discards late completion', async () => {
    let resolveRequest: ((blob: Blob) => void) | undefined
    const speech = setup()
    speech.request.mockImplementationOnce(
      () => new Promise<Blob>((resolve) => { resolveRequest = resolve }),
    )
    speech.controller.startAt(0)
    speech.controller.cancel()
    resolveRequest?.(new Blob(['late']))
    await flush()
    expect(speech.player.prepareSpeech).not.toHaveBeenCalled()
    expect(speech.player.cancelSpeech).toHaveBeenCalled()
  })
})
