import type {Superchart} from "@superchart/index"
import type {KLineData, ReplayEngine} from "@superchart/index"

export type ReplayStatus = "idle" | "loading" | "ready" | "playing" | "paused" | "finished"

/**
 * Thin wrapper over Superchart's playback engine.
 * Manages SC subscriptions and exposes state for React rendering.
 */
export class ReplayController {
  status: ReplayStatus = "idle"
  startTime: number | null = null
  currentTime: number | null = null
  speed: number = 20
  stepsDrawn: number = 0
  cps: number = 0
  bufferRemaining: number = 0
  lastError: string | null = null
  onChange: (() => void) | null = null

  private _superchart: Superchart | null = null
  private _unsubStatus: (() => void) | null = null
  private _unsubStep: (() => void) | null = null
  private _unsubError: (() => void) | null = null
  private _stepTimestamps: number[] = []
  private _cpsIntervalId: ReturnType<typeof setInterval> | null = null

  setSuperchart(sc: Superchart): void {
    this._superchart = sc
    this._wireCallbacks(sc)
  }

  private _wireCallbacks(sc: Superchart): void {
    const engine = sc.replay
    if (engine === null) {
      // Chart not mounted yet — poll until available
      const id = setInterval(() => {
        if (sc.replay !== null) {
          clearInterval(id)
          this._wireCallbacks(sc)
        }
      }, 50)
      return
    }

    this._unsubStatus = engine.onReplayStatusChange((status) => {
      this.status = status as ReplayStatus
      this.currentTime = engine.getReplayCurrentTime() ?? this.currentTime
      this.onChange?.()
    })

    this._unsubStep = engine.onReplayStep((_candle: KLineData, direction: string) => {
      this.currentTime = engine.getReplayCurrentTime() ?? this.currentTime
      if (direction === 'forward') {
        this.stepsDrawn++
        this._stepTimestamps.push(performance.now())
      } else {
        this.stepsDrawn = Math.max(0, this.stepsDrawn - 1)
      }
      this.onChange?.()
    })

    this._unsubError = engine.onReplayError((error: { type: string; detail?: unknown }) => {
      const messages: Record<string, string> = {
        unsupported_resolution: 'This resolution is not available for replay',
        no_data_at_time: 'No data available at this resolution for the selected time',
        resolution_change_failed: 'Failed to change resolution — session restored',
        partial_construction_failed: 'Unable to construct partial candle',
      }
      this.lastError = messages[error.type] ?? error.type
      this.onChange?.()
      setTimeout(() => {
        this.lastError = null
        this.onChange?.()
      }, 5000)
    })
  }

  private get _engine(): ReplayEngine | null {
    return this._superchart?.replay ?? null
  }

  async start(startTimeMs: number): Promise<void> {
    this.stepsDrawn = 0
    this.startTime = startTimeMs
    this.currentTime = startTimeMs
    await this._engine?.setCurrentTime(startTimeMs)
    this.onChange?.()
  }

  play(speed?: number): void {
    if (speed !== undefined) this.speed = speed
    this._engine?.play(this.speed)
    this._startCpsCounter()
  }

  pause(): void {
    this._engine?.pause()
    this._stopCpsCounter()
  }

  step(): void {
    this._engine?.step()
  }

  stepBack(): void {
    this._engine?.stepBack().catch(console.error)
  }

  async restart(): Promise<void> {
    if (this.startTime === null) return
    const startTime = this.startTime
    this.stepsDrawn = 0
    await this._engine?.setCurrentTime(startTime)
    this.onChange?.()
  }

  stop(): void {
    this._stopCpsCounter()
    this.stepsDrawn = 0
    this.startTime = null
    this.currentTime = null
    void this._engine?.setCurrentTime(null)
    this.onChange?.()
  }

  setSpeed(candlesPerSecond: number): void {
    this.speed = candlesPerSecond
    if (this.status === 'playing') {
      this._engine?.play(this.speed)
    }
    this.onChange?.()
  }

  private _startCpsCounter(): void {
    this._stepTimestamps = []
    this._stopCpsCounter()
    this._cpsIntervalId = setInterval(() => {
      const now = performance.now()
      this._stepTimestamps = this._stepTimestamps.filter(t => now - t < 1000)
      this.cps = this._stepTimestamps.length
      this.bufferRemaining = this._engine?.getReplayBufferLength() ?? 0
      this.onChange?.()
    }, 250)
  }

  private _stopCpsCounter(): void {
    if (this._cpsIntervalId !== null) {
      clearInterval(this._cpsIntervalId)
      this._cpsIntervalId = null
    }
    this._stepTimestamps = []
    this.cps = 0
  }

  dispose(): void {
    this._stopCpsCounter()
    this._unsubStatus?.()
    this._unsubStep?.()
    this._unsubError?.()
    this._superchart = null
    this.onChange = null
  }
}
