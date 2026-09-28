export type AudioDiagnosticDetails = Record<
  string,
  string | number | boolean | null | undefined
>

export interface AudioDiagnosticEvent {
  readonly sequence: number
  readonly timestamp: string
  readonly elapsedMs: number
  readonly type: string
  readonly details: Readonly<Record<string, string | number | boolean | null>>
}

const MAX_EVENTS = 500

export class AudioDiagnosticRecorder {
  private readonly events: AudioDiagnosticEvent[] = []
  private readonly listeners = new Set<() => void>()
  private sequence = 0
  private readonly startedAtMs = typeof performance === 'undefined' ? 0 : performance.now()

  constructor(
    private enabled = false,
    private readonly eventLimit = MAX_EVENTS,
  ) {}

  isEnabled(): boolean {
    return this.enabled
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return
    this.enabled = enabled
    if (!enabled) {
      this.clear()
      return
    }
    for (const listener of this.listeners) listener()
  }

  record(type: string, details: AudioDiagnosticDetails = {}): void {
    if (!this.isEnabled()) return

    const cleanedDetails = Object.fromEntries(
      Object.entries(details).filter((entry): entry is [string, string | number | boolean | null] =>
        entry[1] !== undefined,
      ),
    )
    const currentPerformanceMs = typeof performance === 'undefined' ? 0 : performance.now()
    this.events.push({
      sequence: ++this.sequence,
      timestamp: new Date().toISOString(),
      elapsedMs: Math.round(currentPerformanceMs - this.startedAtMs),
      type,
      details: cleanedDetails,
    })
    if (this.events.length > this.eventLimit) this.events.shift()
    for (const listener of this.listeners) listener()
  }

  clear(): void {
    this.events.length = 0
    this.sequence = 0
    for (const listener of this.listeners) listener()
  }

  getEvents(): readonly AudioDiagnosticEvent[] {
    return this.events
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  exportText(): string {
    const header = {
      exportedAt: new Date().toISOString(),
      visibility: typeof document === 'undefined' ? 'unknown' : document.visibilityState,
      userAgent: typeof navigator === 'undefined' ? 'unknown' : navigator.userAgent,
      eventCount: this.events.length,
    }
    return [JSON.stringify(header), ...this.events.map((event) => JSON.stringify(event))].join('\n')
  }
}

export const audioDiagnostics = new AudioDiagnosticRecorder()

export const describeMediaError = (error: unknown): string => {
  if (error instanceof DOMException) return `${error.name}: ${error.message}`
  if (error instanceof Error) return `${error.name}: ${error.message}`
  return String(error)
}
