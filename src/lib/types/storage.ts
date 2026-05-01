/**
 * Storage adapter interface and related types for chart state persistence.
 *
 * Users implement StorageAdapter to save chart state to their preferred backend:
 * - localStorage for simple client-side persistence
 * - REST API for server-side storage
 * - IndexedDB for large datasets
 * - etc.
 *
 * Two reference implementations ship with Superchart:
 * - `LocalStorageAdapter` (`superchart/storage`) — single-device, browser-only
 * - `HttpStorageAdapter` (`superchart/storage`) — talks to a REST backend
 *
 * @see PERSISTENCE_ROADMAP.md
 */

import type { DeepPartial, Styles, PaneOptions, OverlayProperties } from 'klinecharts'
import type { PaneLayout } from './chart'
import type { SavedOverlay } from './overlay'

/**
 * Result of `StorageAdapter.load`: the saved state plus an opaque
 * monotonically-increasing `revision` used for optimistic concurrency.
 *
 * `revision` is **distinct from** `ChartState.version` — `revision` tracks
 * write-order on a per-key basis (multi-device conflicts), `version` tracks
 * the schema migration generation.
 */
export interface StorageRecord {
  state: ChartState
  revision: number
}

/**
 * Result of `StorageAdapter.save` — the new revision after write.
 */
export interface StorageWriteResult {
  revision: number
}

/**
 * Optional metadata returned by `StorageAdapter.list` for each saved key.
 * Adapters that can't cheaply provide some fields may omit them.
 */
export interface StorageEntry {
  key: string
  revision: number
  savedAt?: number
  symbol?: string
  period?: string
}

/**
 * Thrown by `StorageAdapter.save` when `expectedRevision` is supplied and
 * doesn't match the adapter's current revision for that key. Carries the
 * remote state so the caller can merge and retry.
 *
 * `useChartState` catches this internally and runs an array-merge-and-retry
 * loop; consumers only see this surface in their `onStorageError` callback
 * if the retries are exhausted.
 */
export class StorageConflictError extends Error {
  remoteState: ChartState
  remoteRevision: number

  constructor(remoteState: ChartState, remoteRevision: number, message?: string) {
    super(message ?? 'Storage write conflict: remote revision is ahead')
    this.name = 'StorageConflictError'
    this.remoteState = remoteState
    this.remoteRevision = remoteRevision
    // Preserve prototype chain across transpilation targets
    Object.setPrototypeOf(this, StorageConflictError.prototype)
  }
}

/**
 * Storage adapter interface.
 *
 * Implement this interface to persist chart state to any backend, or use one
 * of the bundled implementations:
 *
 * @example
 * ```typescript
 * import { LocalStorageAdapter, HttpStorageAdapter } from 'superchart'
 *
 * // Browser localStorage
 * const adapter = new LocalStorageAdapter()
 *
 * // REST backend (see PERSISTENCE_ROADMAP.md for the contract)
 * const adapter = new HttpStorageAdapter({ baseUrl: '/api/chart-state' })
 *
 * new Superchart({ ..., storageAdapter: adapter, storageKey: 'btc-1h' })
 * ```
 *
 * Custom implementation:
 *
 * @example
 * ```typescript
 * const adapter: StorageAdapter = {
 *   async load(key) {
 *     const raw = localStorage.getItem(`chart:${key}`)
 *     if (!raw) return null
 *     return JSON.parse(raw)  // { state, revision }
 *   },
 *
 *   async save(key, state, expectedRevision) {
 *     const raw = localStorage.getItem(`chart:${key}`)
 *     const current = raw ? JSON.parse(raw) : { revision: 0 }
 *     if (expectedRevision !== undefined && current.revision !== expectedRevision) {
 *       throw new StorageConflictError(current.state, current.revision)
 *     }
 *     const next = { state, revision: current.revision + 1 }
 *     localStorage.setItem(`chart:${key}`, JSON.stringify(next))
 *     return { revision: next.revision }
 *   },
 *
 *   async delete(key) {
 *     localStorage.removeItem(`chart:${key}`)
 *   }
 * }
 * ```
 */
export interface StorageAdapter {
  /**
   * Load chart state and current revision.
   *
   * @param key - Unique key for this chart (e.g. `${userId}:${symbol}`)
   * @returns `{ state, revision }` or `null` if no record exists
   */
  load(key: string): Promise<StorageRecord | null>

  /**
   * Save chart state.
   *
   * If `expectedRevision` is provided and doesn't match the adapter's current
   * revision for the key, throw `StorageConflictError` carrying the remote
   * state so the caller can merge and retry. If `expectedRevision` is omitted,
   * the save is unconditional (last-write-wins).
   *
   * @param key - Unique key for this chart
   * @param state - Serialized chart state
   * @param expectedRevision - Last revision the caller observed; omit for last-write-wins
   * @returns `{ revision }` — the new revision after the write
   * @throws StorageConflictError when `expectedRevision` is stale
   */
  save(key: string, state: ChartState, expectedRevision?: number): Promise<StorageWriteResult>

  /**
   * Delete saved state.
   *
   * @param key - Unique key for this chart
   */
  delete(key: string): Promise<void>

  /**
   * Optional: list all saved chart keys with metadata.
   * Useful for displaying saved layouts or migrations.
   *
   * @param prefix - Optional prefix to filter keys
   */
  list?(prefix?: string): Promise<StorageEntry[]>
}

/**
 * Complete serializable chart state.
 * This is what gets saved/loaded by the StorageAdapter.
 */
export interface ChartState {
  /** Schema version for migrations (NOT the optimistic-concurrency revision). */
  version: number

  /** Saved indicators (metadata only, not data) */
  indicators: SavedIndicator[]

  /** Saved overlays (drawings) */
  overlays: SavedOverlay[]

  /** Chart style customizations */
  styles: DeepPartial<Styles>

  /** Pane layout configuration */
  paneLayout: PaneLayout[]

  /** User preferences */
  preferences: ChartPreferences

  /** Timestamp when last saved */
  savedAt?: number

  /** Optional: Symbol this state was saved for */
  symbol?: string

  /** Optional: Period this state was saved for */
  period?: string

  /** Default style templates per overlay type (e.g., { straightLine: { lineColor: '#ff0000' } }) */
  overlayDefaults?: Record<string, DeepPartial<OverlayProperties>>
}

/**
 * Current schema version.
 * Increment when making breaking changes to ChartState.
 */
export const CHART_STATE_VERSION = 1

/**
 * Saved indicator reference.
 * Contains only the information needed to re-create the indicator.
 * For backend indicators, actual data is recalculated when loaded.
 */
export interface SavedIndicator {
  /** Unique instance ID */
  id: string

  /** Indicator type name (e.g., "RSI", "MACD", "VOL") - string to allow custom indicators */
  name: string

  /** Pane where indicator is displayed */
  paneId: string

  /** User-configured calc params (for built-in indicators) */
  calcParams?: unknown[]

  /** User-configured settings (for backend indicators) */
  settings?: Record<string, SettingValue>

  /** Whether indicator is currently visible */
  visible: boolean

  /** Whether stacked with other indicators in same pane */
  isStack?: boolean

  /** Pane options when created */
  paneOptions?: PaneOptions

  /** Optional: custom styles override */
  styles?: Record<string, unknown>
}

/**
 * Setting value types
 */
export type SettingValue = number | boolean | string

/**
 * Chart user preferences
 */
export interface ChartPreferences {
  /** Show volume pane */
  showVolume: boolean

  /** Show crosshair on hover */
  showCrosshair: boolean

  /** Show grid lines */
  showGrid: boolean

  /** Show indicator legends */
  showLegend: boolean

  /** Drawing magnet mode */
  magnetMode: 'normal' | 'weak' | 'strong'

  /** Timezone for display (IANA format) */
  timezone?: string

  /** Locale for formatting */
  locale?: string
}

/**
 * Create default empty chart state
 */
export function createEmptyChartState(): ChartState {
  return {
    version: CHART_STATE_VERSION,
    indicators: [],
    overlays: [],
    styles: {},
    paneLayout: [],
    preferences: {
      showVolume: true,
      showCrosshair: true,
      showGrid: true,
      showLegend: true,
      magnetMode: 'normal',
    },
    savedAt: Date.now(),
  }
}

/**
 * Validate and migrate chart state if needed.
 * Returns null if state is invalid and can't be migrated.
 */
export function migrateChartState(state: unknown): ChartState | null {
  if (!state || typeof state !== 'object') {
    return null
  }

  const s = state as Partial<ChartState>

  // Check version and migrate if needed
  if (typeof s.version !== 'number') {
    // Assume version 1 for legacy states
    s.version = 1
  }

  // Ensure required arrays exist
  if (!Array.isArray(s.indicators)) s.indicators = []
  if (!Array.isArray(s.overlays)) s.overlays = []
  if (!Array.isArray(s.paneLayout)) s.paneLayout = []
  if (!s.styles) s.styles = {}
  if (!s.preferences) {
    s.preferences = {
      showVolume: true,
      showCrosshair: true,
      showGrid: true,
      showLegend: true,
      magnetMode: 'normal',
    }
  }

  // Future: Add migration logic for version upgrades
  // if (s.version < 2) { migrate_v1_to_v2(s) }

  return s as ChartState
}

/**
 * Merge two ChartState values for optimistic-concurrency conflict resolution.
 *
 * Strategy:
 * - Indicators and overlays are merged by `id`. Items present in only one
 *   side are kept; items present in both sides take the `local` version
 *   (i.e. the in-progress edit the user just made wins over the remote
 *   change for that single record).
 * - All other fields (styles, paneLayout, preferences, overlayDefaults,
 *   metadata) are last-write-wins from `local`.
 *
 * The retry loop in `useChartState` calls this when `StorageConflictError`
 * is caught: the remote state becomes the new base, and the local mutation
 * is replayed atop the merged result.
 */
export function mergeChartStates(local: ChartState, remote: ChartState): ChartState {
  const overlayMap = new Map<string, SavedOverlay>()
  for (const o of remote.overlays) overlayMap.set(o.id, o)
  for (const o of local.overlays) overlayMap.set(o.id, o)

  const indicatorMap = new Map<string, SavedIndicator>()
  for (const i of remote.indicators) indicatorMap.set(i.id, i)
  for (const i of local.indicators) indicatorMap.set(i.id, i)

  return {
    ...remote,
    ...local,
    indicators: Array.from(indicatorMap.values()),
    overlays: Array.from(overlayMap.values()),
    overlayDefaults: { ...remote.overlayDefaults, ...local.overlayDefaults },
  }
}

// Re-export SavedOverlay from overlay.ts for convenience
export type { SavedOverlay } from './overlay'
