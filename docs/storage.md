# State Persistence

Superchart saves the following per-key state when a `StorageAdapter` is configured:

- Active indicators (name, calc params, paneId, visibility)
- Drawing overlays (type, points, properties, figure styles, timeframe visibility)
- Chart style customizations
- Pane layout (heights)
- Default style templates per overlay type (`overlayDefaults`)
- User preferences (volume, crosshair, grid, legend, magnet mode, timezone, locale)

State is loaded on chart initialization and saved automatically whenever
indicators, overlays, or settings change. Multi-device conflicts are resolved
internally via an array-merge-by-id retry loop — see [Conflict resolution](#conflict-resolution-multi-device).

---

## Quick start

Two reference implementations ship with Superchart. Pick one or write your own:

### LocalStorageAdapter (browser-only)

```typescript
import { Superchart, LocalStorageAdapter, createDataLoader } from 'superchart'

const adapter = new LocalStorageAdapter()  // namespace defaults to 'superchart:'

new Superchart({
  container: '#chart',
  symbol: { ticker: 'BTCUSDT', pricePrecision: 2, volumePrecision: 0 },
  period: { type: 'hour', span: 1, text: '1H' },
  dataLoader: createDataLoader(myDatafeed),
  storageAdapter: adapter,
  storageKey: 'BTCUSDT',  // any string; common shapes: ${userId}:${symbol}, ${layoutId}, etc.
})
```

### HttpStorageAdapter (REST backend)

```typescript
import { Superchart, HttpStorageAdapter, createDataLoader } from 'superchart'

const adapter = new HttpStorageAdapter({
  baseUrl: 'https://api.example.com/chart-state',
  // Optional auth headers re-evaluated on every request:
  headers: () => ({ Authorization: `Bearer ${getAccessToken()}` }),
})

new Superchart({
  container: '#chart',
  // …
  storageAdapter: adapter,
  storageKey: `${userId}:BTCUSDT`,
})
```

The HTTP backend must implement the [REST contract](#http-rest-contract) below.
A working implementation lives in [`examples/server`](../examples/server) — run
it and point `baseUrl` at `http://localhost:8080/chart-state`.

---

## StorageAdapter interface

```typescript
import type {
  StorageAdapter,
  ChartState,
  StorageRecord,
  StorageWriteResult,
  StorageEntry,
} from 'superchart'
import { StorageConflictError } from 'superchart'

interface StorageAdapter {
  /** Returns the saved record + revision, or null if no record exists. */
  load(key: string): Promise<StorageRecord | null>

  /**
   * Save state. If `expectedRevision` is provided and stale, throws
   * `StorageConflictError` carrying the remote state so the caller can merge.
   * Omit `expectedRevision` for last-write-wins.
   */
  save(
    key: string,
    state: ChartState,
    expectedRevision?: number,
  ): Promise<StorageWriteResult>

  delete(key: string): Promise<void>

  /** Optional. Lists keys (with metadata) for "open chart" UIs. */
  list?(prefix?: string): Promise<StorageEntry[]>
}

interface StorageRecord { state: ChartState; revision: number }
interface StorageWriteResult { revision: number }
```

### Two distinct version concepts

| Field                   | Purpose                                                           | Who bumps it                                                       |
|-------------------------|-------------------------------------------------------------------|--------------------------------------------------------------------|
| `ChartState.version`    | **Schema migration version.** Increments when the shape of `ChartState` changes (e.g. a new required field). Read by `migrateChartState`. | Superchart authors, on breaking schema changes. |
| `StorageRecord.revision`| **Optimistic-concurrency revision.** Per-key write counter. Increments on every successful save. | Adapter, on every save.                                            |

Don't confuse them — `version` is rare and slow-moving, `revision` changes on
every drawing/indicator edit.

---

## Conflict resolution (multi-device)

When two devices (or two browser tabs) edit the same `storageKey`
concurrently, Superchart's internal `useChartState` hook handles the merge
transparently:

1. Each mutation runs `load → mutate → save(state, expectedRevision)`.
2. If the adapter's stored revision has advanced (someone else saved first),
   the adapter throws `StorageConflictError(remoteState, remoteRevision)`.
3. The hook merges `remoteState` with the local result via
   `mergeChartStates`:
   - **Indicators and overlays** — array-merge by `id`. Items present on
     either side are kept; concurrent edits to the *same* id last-write-wins
     on that record.
   - **Styles, pane layout, preferences, overlayDefaults** — last-write-wins
     scalar/object replacement.
4. The mutation is replayed atop the merged base, then re-saved.
5. After 3 attempts (`SAVE_RETRY_LIMIT`) the error is reported via the
   `onStorageError` option and re-thrown.

The default merge is good for ~90% of cases — a user who draws different
trendlines on two devices ends up with both. If your domain needs stronger
guarantees (e.g. CRDTs, per-field operational transforms, multi-user cursors),
the `StorageAdapter` is a clean seam to wrap with custom logic, but Superchart
itself has no built-in support for that — see
[`PERSISTENCE_ROADMAP.md`](../PERSISTENCE_ROADMAP.md).

### Surfacing storage errors to your UI

```typescript
new Superchart({
  // …
  storageAdapter: adapter,
  storageKey: 'BTCUSDT',
  onStorageError: (err) => {
    console.error('chart save failed:', err)
    showToast('Could not save chart — check your connection.')
  },
})
```

---

## HTTP REST contract

`HttpStorageAdapter` and any compatible server must agree on the following
endpoints (rooted at the `baseUrl` passed to the adapter):

### `GET {baseUrl}/{key}` — load

- **Response 200:** `{ "state": ChartState, "revision": number }`
- **Response 404:** record doesn't exist

### `PUT {baseUrl}/{key}` — save

- **Body:** `{ "state": ChartState }`
- **Header (optional):** `If-Match: <revision>` — when present, the server
  MUST reject the write if the current stored revision differs.
- **Response 200:** `{ "revision": number }` — the new revision after write
- **Response 409:** `{ "remoteState": ChartState, "remoteRevision": number }`
  — `If-Match` was stale; the client must merge & retry.

### `DELETE {baseUrl}/{key}` — remove

- **Response 204:** removed
- **Response 404:** didn't exist (treat as success)

### `GET {baseUrl}` — list

- **Response 200:** `[{ "key": string, "revision": number, "savedAt": number, "symbol"?: string, "period"?: string }, ...]`
- **Optional query:** `?prefix=foo` filters to keys starting with `foo`

### Reference server

[`examples/server`](../examples/server) implements this contract on top of
SQLite. Key files:

- `src/db.ts` — `chart_state(key, state, revision, updated_at, symbol, period)` table + `loadChartState` / `saveChartState` / `deleteChartState` / `listChartStates`
- `src/chartStateRoutes.ts` — Node `http` request handler with CORS
- `src/index.ts` — combined http/WebSocket server (the WebSocket script
  protocol and the HTTP chart-state API share one port)

The `saveChartState` helper uses `UPDATE … WHERE revision = ?` plus an
affected-row check as the optimistic-lock primitive, so concurrent writers are
rejected even under thundering-herd conditions.

---

## What gets saved (and what doesn't)

Not every overlay should be saved. Some are user-drawn (clearly persistable);
others are app-state-driven (orders, alerts, trades) where the *backend* is
the source of truth and saving them would only cause stale data and
duplicates on reload.

| Path                                                                                  | Saves?                  | When to use it                                                                                         |
|---------------------------------------------------------------------------------------|-------------------------|--------------------------------------------------------------------------------------------------------|
| Drawing bar (user-drawn shapes)                                                       | ✅ default              | User intent — fib retracements, trendlines, annotations.                                               |
| `superchart.createOverlay({...})`                                                     | ✅ default; opt-out via `{ save: false }` | Custom overlays from app code that should restore on reload. Use `save: false` for transients (measurements, hover annotations). |
| `superchart.getChart().createOverlay(...)` (direct klinecharts)                       | ❌                      | Escape hatch — bypasses Superchart's lifecycle entirely.                                               |
| `createOrderLine(chart, ...)`, `createPriceLine(chart, ...)`, `createTradeLine(chart, ...)` | ❌ deliberately         | Backend-driven visualizations. The consumer's app code re-creates them on reload from current data.    |

### Why fluent factories don't save

Order lines, price lines, and trade lines visualize **app state from a
backend** — a live order, an alert price, a historical trade. The backend is
authoritative; on reload the consumer's app code reconstructs these from
fresh data. If the chart library also saved them, you'd get a stale entity
plus a fresh one drawn on top.

By design, these factories take a `chart` argument and bypass Superchart's
save layer entirely. There are no `superchart.createOrderLine(...)`
wrappers. **You** own their lifecycle.

### Per-overlay opt-out

Mirroring TradingView's `disableSave` flag on `createMultipointShape` /
`createShape`:

```typescript
// Transient overlay — renders, never persists, never restores.
superchart.createOverlay({
  name: 'rectangle',
  points: [{ timestamp: t0, value: p0 }, { timestamp: t1, value: p1 }],
  save: false,
})
```

Useful for ephemeral annotations (e.g. a hover-driven measurement, a
"highlighted candle" rectangle that's purely a UI hint).

---

## Imperative save/load API

Auto-save handles the common case, but consumers sometimes need explicit
control — a "Save" button, pre-navigation flush, "revert to saved" UX, or a
custom chart browser.

```typescript
// Force a save of current chart state (last-write-wins, no merge-retry).
await superchart.saveState()

// Re-fetch saved state from the adapter and re-apply to the chart.
// Best invoked once after the chart has mounted, before user interaction.
// (Currently additive — overlays/indicators already on the chart aren't
// removed first; remount the chart for a clean "revert" UX.)
await superchart.loadState()

// Delete the saved record for the current storageKey.
// Does NOT clear the chart visually — current overlays/indicators remain.
await superchart.clearState()

// Adapter's list passthrough. Returns [] if no adapter is configured or
// the adapter doesn't implement list().
const entries = await superchart.listSavedStates()
// → [{ key, revision, savedAt, symbol?, period? }, ...]
```

These complement (don't replace) the auto-save behavior. If you're disabling
auto-save (via the upcoming `auto_save_state` feature flag) you'll want to
call `saveState()` from your own code at the right moments.

---

## Storage key strategies

`storageKey` is opaque to Superchart — pick whatever distinguishes the chart
states you care about:

```typescript
// Per-user, per-symbol — separate state for every user/symbol pair
storageKey: `${userId}:${symbol}`

// Per-symbol only — shared across all users (e.g. an organisation chart)
storageKey: symbol

// Per-named-layout — useful when the user has multiple saved chart layouts
// (e.g. "Scalping setup", "Swing setup")
storageKey: `layout:${layoutId}`

// Global — single shared state across the whole app
storageKey: 'global'
```

If `storageKey` is omitted from `SuperchartOptions`, Superchart defaults to
`symbol.ticker`.

---

## Custom adapter — minimal example

```typescript
import { StorageConflictError, type StorageAdapter } from 'superchart'

const myAdapter: StorageAdapter = {
  async load(key) {
    const raw = localStorage.getItem(`chart:${key}`)
    if (!raw) return null
    return JSON.parse(raw)
  },
  async save(key, state, expectedRevision) {
    const raw = localStorage.getItem(`chart:${key}`)
    const current = raw ? JSON.parse(raw) : { state: null, revision: 0 }
    if (expectedRevision !== undefined && current.revision !== expectedRevision) {
      throw new StorageConflictError(current.state, current.revision)
    }
    const next = { state, revision: current.revision + 1 }
    localStorage.setItem(`chart:${key}`, JSON.stringify(next))
    return { revision: next.revision }
  },
  async delete(key) {
    localStorage.removeItem(`chart:${key}`)
  },
}
```

For an IndexedDB / REST / URL-encoded variant, see the bundled adapters in
`src/lib/storage/` for working reference.

---

## Study templates (indicator presets)

Save and re-apply named indicator configurations — TradingView calls
these "study templates". The four adapter methods are **all optional**:
adapters that don't implement them simply hide the templates UI in the
indicator settings modal.

```typescript
interface StorageAdapter {
  // …existing methods…
  listStudyTemplates?(indicatorName?: string): Promise<StudyTemplateMeta[]>
  loadStudyTemplate?(name: string): Promise<StudyTemplate | null>
  saveStudyTemplate?(name: string, template: StudyTemplate): Promise<void>
  deleteStudyTemplate?(name: string): Promise<void>
}

interface StudyTemplate extends StudyTemplateMeta {
  calcParams?: unknown[]               // built-in indicators
  settings?: Record<string, SettingValue>  // backend indicators
  styles?: Record<string, unknown>
}

interface StudyTemplateMeta {
  name: string
  indicatorName: string
  system?: boolean   // true when bundled (read-only)
  savedAt?: number
}
```

### Bundled "system" templates

Both bundled adapters surface a small list of read-only presets via
`listStudyTemplates` (RSI 14, MACD 12/26/9, EMA 50, EMA 200, BOLL 20).
Custom adapters can choose to include them too — import from
`'superchart'`:

```typescript
import { SYSTEM_STUDY_TEMPLATES } from 'superchart'
```

Saving over a system name creates a user copy that *shadows* the system
one for subsequent loads. Deleting a system template throws (or returns
`403` over HTTP).

### REST contract

```
GET    {root}/study-templates                   → 200 [StudyTemplateMeta…]
GET    {root}/study-templates?indicatorName=RSI → filtered list
GET    {root}/study-templates/:name             → 200 StudyTemplate | 404
PUT    {root}/study-templates/:name             body: StudyTemplate
                                                → 204 | 403 (system name)
DELETE {root}/study-templates/:name             → 204 | 403 | 404
```

`{root}` is the parent of the `chart-state` baseUrl. With
`baseUrl: '/api/chart-state'`, study templates live at
`/api/study-templates`.

[`examples/server`](../examples/server) implements the contract on top
of a `study_templates(name PK, indicator_name, body, updated_at)` SQLite
table + a hardcoded list of system templates that mirrors the bundled
client list. Keep both lists in sync when adding new system presets.

### UI

When `study_templates` feature flag is on AND the active adapter
implements all four methods, the indicator settings modal shows a
"Template" row with: a select listing system + user templates, an
**Apply** button that overwrites the current form fields with the
selected template's body, a **Save as…** button that prompts for a name,
and a **Delete** button (disabled for system templates).

Hide the row entirely by setting `disabledFeatures: ['study_templates']`
in `SuperchartOptions`.

---

## ChartState shape

```typescript
interface ChartState {
  version: number              // schema migration version
  indicators: SavedIndicator[] // metadata only (data is recomputed)
  overlays: SavedOverlay[]
  styles: DeepPartial<Styles>
  paneLayout: PaneLayout[]
  preferences: ChartPreferences
  savedAt?: number
  symbol?: string
  period?: string
  overlayDefaults?: Record<string, DeepPartial<OverlayProperties>>
}
```

Migration helpers for forward-compatible adapters:

```typescript
import { CHART_STATE_VERSION, migrateChartState, createEmptyChartState, mergeChartStates } from 'superchart'
```

---

## Roadmap

The persistence work is staged across multiple tickets — chart-state
save/load (this doc), feature flags, study/drawing/chart templates, and the
multi-chart browser. See [`PERSISTENCE_ROADMAP.md`](../PERSISTENCE_ROADMAP.md)
at the repo root for the full plan and what's coming next.
