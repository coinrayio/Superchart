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
