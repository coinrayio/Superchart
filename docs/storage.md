# State Persistence

Superchart saves the following per-symbol state when a `StorageAdapter` is configured:

- Active backend indicator subscriptions (name + settings)
- Drawing overlays (type, points, styling)
- Style customizations
- Pane layout (heights)
- User preferences (volume visibility, crosshair, grid, legend, magnet mode, timezone, locale)

State is loaded on chart initialization and saved automatically whenever indicators, overlays, or settings change.

---

## StorageAdapter Interface

```typescript
export interface StorageAdapter {
  /**
   * Persist the chart state.
   * @param key   - Unique key for this chart instance (see storageKey option).
   * @param state - Full serializable state object.
   */
  save(key: string, state: ChartState): Promise<void>

  /**
   * Load previously saved state.
   * @param key - Same key used in save().
   * @returns ChartState, or null if no state exists for this key.
   */
  load(key: string): Promise<ChartState | null>

  /**
   * Delete saved state for this key.
   */
  delete(key: string): Promise<void>

  /**
   * Optional. List all saved keys, optionally filtered by prefix.
   * Useful for implementing a "saved layouts" browser or bulk migration.
   */
  list?(prefix?: string): Promise<string[]>
}
```

---

## ChartState Interface

```typescript
export interface ChartState {
  /** Schema version. Currently 1. Increment when making breaking changes. */
  version: number

  /** Active backend indicators. Restored via IndicatorProvider.subscribe(). */
  indicators: SavedIndicator[]

  /** Drawing overlays (trend lines, shapes, etc.) */
  overlays: SavedOverlay[]

  /** Style overrides — DeepPartial<Styles> from klinecharts */
  styles: DeepPartial<Styles>

  /** Pane height configuration */
  paneLayout: PaneLayout[]

  /** User preferences */
  preferences: ChartPreferences

  /** Unix ms timestamp of last save */
  savedAt?: number

  /** Ticker the state was saved for (informational) */
  symbol?: string

  /** Period text the state was saved for (informational) */
  period?: string
}
```

### SavedIndicator

```typescript
export interface SavedIndicator {
  /** Runtime subscription ID */
  id: string
  /** Indicator type name (e.g. 'RSI', 'MACD', 'VOL') */
  name: string
  /** Pane where the indicator lives */
  paneId: string
  /** Calc params for built-in klinecharts indicators */
  calcParams?: unknown[]
  /** User-configured settings for backend indicators */
  settings?: Record<string, SettingValue>
  visible: boolean
  isStack?: boolean
  paneOptions?: PaneOptions
  styles?: Record<string, unknown>
}
```

Backend indicators are identified by the presence of `settings` and absence of `calcParams`. Built-in klinecharts indicators use `calcParams` and no `settings`.

### ChartPreferences

```typescript
export interface ChartPreferences {
  showVolume: boolean
  showCrosshair: boolean
  showGrid: boolean
  showLegend: boolean
  /** Drawing magnet mode */
  magnetMode: 'normal' | 'weak' | 'strong'
  /** IANA timezone (overrides chart-level timezone when set) */
  timezone?: string
  /** Locale (overrides chart-level locale when set) */
  locale?: string
}
```

### PaneLayout

```typescript
export interface PaneLayout {
  id: string
  height: number
  minHeight?: number
  state: 'normal' | 'maximize' | 'minimize'
  order: number
}
```

---

## Utility Functions

### createEmptyChartState

```typescript
function createEmptyChartState(): ChartState
```

Returns a valid `ChartState` with empty arrays and sensible preference defaults. Useful as a baseline when a storage adapter saves new state for the first time.

```typescript
import { createEmptyChartState } from 'superchart'

const state = createEmptyChartState()
// state.indicators === []
// state.overlays === []
// state.preferences.showVolume === true
// state.preferences.magnetMode === 'normal'
```

### migrateChartState

```typescript
function migrateChartState(state: unknown): ChartState | null
```

Validates an arbitrary value as a `ChartState` and applies schema migrations. Returns `null` if the value is not recoverable. Call this when loading state from an external source (localStorage, API) before using it.

```typescript
const raw = localStorage.getItem('chart:BTCUSDT')
const state = raw ? migrateChartState(JSON.parse(raw)) : null
if (state) {
  // safe to use
}
```

---

## storageKey Option

By default, `storageKey` equals `symbol.ticker`. This means each symbol gets its own saved state. Change it to customize the key structure:

```typescript
// Per-user, per-symbol key
new Superchart({
  storageKey: `${userId}:${symbol.ticker}`,
  storageAdapter,
  // ...
})

// Shared global layout (all symbols share one state)
new Superchart({
  storageKey: 'global-layout',
  storageAdapter,
  // ...
})
```

---

## Example: localStorage Adapter

```typescript
import type { StorageAdapter, ChartState } from 'superchart'
import { migrateChartState } from 'superchart'

export const localStorageAdapter: StorageAdapter = {
  async save(key: string, state: ChartState): Promise<void> {
    try {
      localStorage.setItem(`superchart:${key}`, JSON.stringify(state))
    } catch (e) {
      // Handle QuotaExceededError if needed
      console.warn('Failed to save chart state:', e)
    }
  },

  async load(key: string): Promise<ChartState | null> {
    const raw = localStorage.getItem(`superchart:${key}`)
    if (!raw) return null
    try {
      return migrateChartState(JSON.parse(raw))
    } catch {
      return null
    }
  },

  async delete(key: string): Promise<void> {
    localStorage.removeItem(`superchart:${key}`)
  },

  async list(prefix?: string): Promise<string[]> {
    const keys: string[] = []
    const p = `superchart:${prefix ?? ''}`
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith(p)) {
        keys.push(k.slice('superchart:'.length))
      }
    }
    return keys
  },
}
```

Usage:

```typescript
import Superchart, { createDataLoader } from 'superchart'
import { localStorageAdapter } from './adapters/localStorage'

const chart = new Superchart({
  container: 'chart',
  symbol: { ticker: 'BTCUSDT', pricePrecision: 2, volumePrecision: 0 },
  period: { type: 'hour', span: 1, text: '1H' },
  dataLoader: createDataLoader(datafeed),
  storageAdapter: localStorageAdapter,
})
```

---

## Example: REST API Adapter

```typescript
import type { StorageAdapter, ChartState } from 'superchart'
import { migrateChartState } from 'superchart'

export function createApiAdapter(baseUrl: string, authToken: string): StorageAdapter {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
  }

  return {
    async save(key, state) {
      await fetch(`${baseUrl}/charts/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(state),
      })
    },

    async load(key) {
      const res = await fetch(`${baseUrl}/charts/${encodeURIComponent(key)}`, { headers })
      if (!res.ok) return null
      const raw = await res.json()
      return migrateChartState(raw)
    },

    async delete(key) {
      await fetch(`${baseUrl}/charts/${encodeURIComponent(key)}`, {
        method: 'DELETE',
        headers,
      })
    },

    async list(prefix) {
      const url = prefix
        ? `${baseUrl}/charts?prefix=${encodeURIComponent(prefix)}`
        : `${baseUrl}/charts`
      const res = await fetch(url, { headers })
      if (!res.ok) return []
      const data = await res.json()
      return data.keys ?? []
    },
  }
}
```

---

## Example: URL-Shareable Chart State

Serialize the chart state into a URL parameter for sharing a specific chart layout:

```typescript
import type { ChartState } from 'superchart'
import { createEmptyChartState, migrateChartState } from 'superchart'

function encodeState(state: ChartState): string {
  const json = JSON.stringify(state)
  // Use base64url encoding; consider compression for large states
  return btoa(json)
}

function decodeState(encoded: string): ChartState | null {
  try {
    const json = atob(encoded)
    return migrateChartState(JSON.parse(json))
  } catch {
    return null
  }
}

// When sharing: serialize current state to URL
const url = new URL(window.location.href)
url.searchParams.set('chart', encodeState(await storageAdapter.load(storageKey) ?? createEmptyChartState()))
console.log('Share URL:', url.toString())

// When loading from URL: deserialize and inject as initial state
const param = new URLSearchParams(window.location.search).get('chart')
const sharedState = param ? decodeState(param) : null

const urlStorageAdapter: StorageAdapter = {
  async save(key, state) {
    // Persist to a real backend after sharing
    await realAdapter.save(key, state)
  },
  async load(_key) {
    // On first load, return the URL state; subsequent saves go to realAdapter
    return sharedState
  },
  async delete(key) {
    await realAdapter.delete(key)
  },
}
```
