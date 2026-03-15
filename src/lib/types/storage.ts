/**
 * Storage adapter interface and related types for chart state persistence.
 *
 * Users implement StorageAdapter to save chart state to their preferred backend:
 * - localStorage for simple client-side persistence
 * - REST API for server-side storage
 * - IndexedDB for large datasets
 * - etc.
 */

import type { DeepPartial, Styles, PaneOptions, OverlayProperties } from 'klinecharts'
import type { PaneLayout } from './chart'
import type { SavedOverlay } from './overlay'

/**
 * Storage adapter interface.
 *
 * Implement this interface to persist chart state to any backend.
 *
 * @example
 * ```typescript
 * // localStorage implementation
 * const localStorageAdapter: StorageAdapter = {
 *   async save(key, state) {
 *     localStorage.setItem(`superchart:${key}`, JSON.stringify(state))
 *   },
 *   async load(key) {
 *     const data = localStorage.getItem(`superchart:${key}`)
 *     return data ? JSON.parse(data) : null
 *   },
 *   async delete(key) {
 *     localStorage.removeItem(`superchart:${key}`)
 *   }
 * }
 *
 * // API implementation
 * const apiAdapter: StorageAdapter = {
 *   async save(key, state) {
 *     await fetch(`/api/charts/${key}`, {
 *       method: 'PUT',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify(state)
 *     })
 *   },
 *   async load(key) {
 *     const res = await fetch(`/api/charts/${key}`)
 *     return res.ok ? res.json() : null
 *   },
 *   async delete(key) {
 *     await fetch(`/api/charts/${key}`, { method: 'DELETE' })
 *   }
 * }
 * ```
 */
export interface StorageAdapter {
  /**
   * Save chart state.
   * Called when indicators, overlays, or settings change.
   *
   * @param key - Unique key for this chart (e.g., `${userId}:${symbol}`)
   * @param state - Serialized chart state
   */
  save(key: string, state: ChartState): Promise<void>

  /**
   * Load chart state.
   * Called on chart initialization.
   *
   * @param key - Unique key for this chart
   * @returns Saved state or null if none exists
   */
  load(key: string): Promise<ChartState | null>

  /**
   * Delete saved state.
   *
   * @param key - Unique key for this chart
   */
  delete(key: string): Promise<void>

  /**
   * Optional: List all saved chart keys.
   * Useful for displaying saved layouts or migrations.
   *
   * @param prefix - Optional prefix to filter keys
   */
  list?(prefix?: string): Promise<string[]>
}

/**
 * Complete serializable chart state.
 * This is what gets saved/loaded by the StorageAdapter.
 */
export interface ChartState {
  /** Schema version for migrations */
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

// Re-export SavedOverlay from overlay.ts for convenience
export type { SavedOverlay } from './overlay'
