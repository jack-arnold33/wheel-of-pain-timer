import { describe, expect, it, vi } from 'vitest'
import { AudioDiagnosticRecorder } from './audioDiagnostics'

describe('audio diagnostics', () => {
  it('does not retain events while disabled', () => {
    const diagnostics = new AudioDiagnosticRecorder(false)

    diagnostics.record('cue-scheduled', { phaseIndex: 2 })

    expect(diagnostics.getEvents()).toEqual([])
  })

  it('retains bounded structured events and notifies subscribers', () => {
    const diagnostics = new AudioDiagnosticRecorder(true, 2)
    const listener = vi.fn()
    diagnostics.subscribe(listener)

    diagnostics.record('first', { omitted: undefined })
    diagnostics.record('second', { remainingMs: 3_000 })
    diagnostics.record('third', { completion: 'ended' })

    expect(listener).toHaveBeenCalledTimes(3)
    expect(diagnostics.getEvents().map(({ type }) => type)).toEqual(['second', 'third'])
    expect(diagnostics.getEvents()[0].details).toEqual({ remainingMs: 3_000 })
  })

  it('exports a machine-readable header and JSON-lines events', () => {
    const diagnostics = new AudioDiagnosticRecorder(true)
    diagnostics.record('user-marked-missed-bell', { phaseKind: 'exerciseRest' })

    const lines = diagnostics.exportText().split('\n').map((line) => JSON.parse(line))

    expect(lines[0]).toMatchObject({ eventCount: 1 })
    expect(lines[1]).toMatchObject({
      type: 'user-marked-missed-bell',
      details: { phaseKind: 'exerciseRest' },
    })
  })

  it('clears retained events and resets numbering', () => {
    const diagnostics = new AudioDiagnosticRecorder(true)
    diagnostics.record('first')
    diagnostics.clear()
    diagnostics.record('after-clear')

    expect(diagnostics.getEvents()).toMatchObject([{ sequence: 1, type: 'after-clear' }])
  })

  it('can be enabled and disabled at runtime', () => {
    const diagnostics = new AudioDiagnosticRecorder()

    diagnostics.record('ignored')
    diagnostics.setEnabled(true)
    diagnostics.record('retained')
    diagnostics.setEnabled(false)

    expect(diagnostics.isEnabled()).toBe(false)
    expect(diagnostics.getEvents()).toEqual([])
  })
})
