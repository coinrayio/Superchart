# Persistence & Feature-Flag Roadmap

Tracks the full TradingView-equivalent persistence story plus the feature-flag system that gates the related UI. Each section is a self-contained ticket: when assigned `ALTD-XXXX`, replace the placeholder, follow the section, ship the PR.

> **Convention:** sections are listed in execution order. A ticket may only depend on tickets above it.

---

## Glossary

- **`StorageAdapter`** — JavaScript interface a consumer implements to handle save/load. Lives on the `Superchart` side.
- **HTTP Storage Mode** — alternative to writing your own adapter: pass a base URL, Superchart calls a documented REST contract. Implemented internally by `HttpStorageAdapter`. Mirrors TV's `charts_storage_url`.
- **`revision`** — opaque monotonically increasing integer per `(storageKey)` row, used for **optimistic concurrency** (multi-device conflicts). **Distinct from** `ChartState.version` which is the schema-migration version.
- **`StorageConflictError`** — thrown by the adapter when a save's `expectedRevision` doesn't match the remote's current revision. Carries `remoteState` and `remoteRevision` so the caller can merge and retry.
- **Chart State** — the per-key blob: indicators, overlays, styles, prefs, pane layout. One blob per `storageKey`.
- **Templates** — reusable, named, *non*-chart-specific objects: a study template (indicator preset), a drawing template (overlay style preset), a chart template (full layout snapshot).
- **Layout / Chart Browser** — the "open a saved chart" UX. Lists all saved chart-state keys with metadata (name, symbol, period, savedAt).

---

## Ticket 1 — Phase 6: Persistence (StorageAdapter)

**Status:** ALTD-1730 (current)

**Description:**
Implement the full save/load story for chart state, with multi-device conflict handling. Provide two reference adapters (LocalStorage + HTTP), wire the HTTP adapter to a working backend in `examples/server`, and demo it in storybook.

The interface and `useChartState` save-on-change wiring already exist (~80% done). What's missing is: revision/conflict on the interface, two runnable reference adapters, server endpoints, and a storybook demo.

### Scope

- **Extend `StorageAdapter` interface** (backward compatible):
  - `load(key)` returns `{ state, revision } | null` instead of `ChartState | null`.
  - `save(key, state, expectedRevision?)` returns `{ revision }`. If `expectedRevision` is provided and stale, throw `StorageConflictError { remoteState, remoteRevision }`.
  - Keep existing `delete(key)` and `list?(prefix?)` unchanged.
  - Export `StorageConflictError`.
- **Internal merge-retry in `useChartState`**:
  - Wrap each mutation in a small loop: load → mutate → save with expectedRevision → on conflict, retry with the remote state as the new base.
  - Merge strategy: array-merge by id for `indicators` and `overlays` (concurrent unique items kept; concurrent edits to same id → last-write-wins on that record). Document the strategy clearly.
  - Bound the retry count (default 3) to prevent thundering-herd loops; on exhaustion, throw and surface to the consumer via an `onStorageError` callback in `SuperchartOptions`.
- **`LocalStorageAdapter`** — `src/lib/storage/localStorage.ts`. Maintains a real revision counter inside the JSON blob. Exported from `src/lib/index.ts` so consumers can `import { LocalStorageAdapter } from 'superchart'`.
- **`HttpStorageAdapter`** — `src/lib/storage/http.ts`. Constructor takes `{ baseUrl, headers?(): Record<string,string>, fetch?: typeof fetch }`. Implements the REST contract below.
- **REST contract (also documented in `docs/storage.md`):**
  - `GET {baseUrl}/{key}` → `200 { state, revision } | 404`
  - `PUT {baseUrl}/{key}` body `{ state }` with optional header `If-Match: <revision>` → `200 { revision } | 409 { remoteState, remoteRevision }`
  - `DELETE {baseUrl}/{key}` → `204 | 404`
  - `GET {baseUrl}` → `200 [{ key, revision, savedAt, symbol?, period? }]`
- **Server endpoints in `examples/server`:**
  - New SQLite table: `chart_state(key TEXT PRIMARY KEY, state TEXT NOT NULL, revision INTEGER NOT NULL, updated_at TEXT NOT NULL, symbol TEXT, period TEXT)`.
  - Express/Hono/Fastify route handlers for the four endpoints above. Use `UPDATE … WHERE revision = ?` + affected-row check for the optimistic lock.
  - URL prefix: `/chart-state` (configurable via env var if needed).
  - CORS: allow the storybook origin (`http://localhost:6007`).
- **Storybook story:** `API/Persistence`. Toggle between `LocalStorageAdapter` and `HttpStorageAdapter`. Buttons: Save / Load / Clear / "Open in second tab" (for the conflict demo). Shows current revision in the HUD.
- **Docs update:** rewrite `docs/storage.md` to reference the new exports + REST contract; add a "Multi-device conflict resolution" section.

### Acceptance criteria

- [ ] `pnpm build` and `pnpm build:core` pass
- [ ] `LocalStorageAdapter` is exported from `superchart` and works in the Persistence storybook story
- [ ] `HttpStorageAdapter` works against the local `examples/server`
- [ ] Two browser tabs editing the same key produce a `StorageConflictError`; the retry loop merges and persists both edits
- [ ] Mutating overlays/indicators with no `storageAdapter` configured remains a no-op (existing behavior)
- [ ] Schema migration via `migrateChartState` still runs on load
- [ ] `revision` and `ChartState.version` are documented as distinct

### Out of scope (covered by later tickets)

- Templates of any kind (study, drawing, chart)
- Multi-chart browser UI
- Imperative save/load API and per-overlay save opt-out (Ticket 2)
- Feature flags (Ticket 3)
- Real-time / collaborative editing (see Future work below)

---

## Ticket 2 — Save coverage controls and explicit save/load API

**Status:** TBD

**Description:**
Ticket 1 ships auto-save: any drawing-bar overlay or `superchart.createOverlay(...)` call is persisted automatically. This ticket adds two missing pieces:

1. **Per-overlay opt-out** so consumers can create transient overlays that don't pollute saved state. Mirrors TV's `disableSave` flag on `createMultipointShape` / `createShape`.
2. **Explicit imperative save/load API** on the `Superchart` class so consumers can trigger saves/loads/clears manually. Foundation for "revert" UX, pre-navigation flushes, and the multi-chart browser (Ticket 7).

It also documents the architectural divide: which overlay-creation paths save and which don't.

### What stays out of save (by design — not a gap)

The fluent factories `createOrderLine`, `createPriceLine`, `createTradeLine` operate on the chart instance directly and do **not** flow through the save layer. This is deliberate:

- They visualize app state from a backend (orders, alerts, trades), not user intent.
- The backend is the source of truth; on reload the consumer's app code re-creates the lines from current backend data.
- Saving them would cause stale data on reload and duplicate lines once the consumer re-creates them.

We will **not** add `superchart.createOrderLine(...)` wrappers. The contract is documented in `docs/storage.md` instead.

### Scope

#### Per-overlay save opt-out
- Add a `save?: boolean` field to `OverlayCreate` (default `true`). The Superchart-side type extension goes in `src/lib/types/overlay.ts`.
- `useChartState.pushOverlay` reads `save !== false` before calling `syncOverlay` on draw-end / move-end.
- `restoreChartState` is unaffected — overlays with `save: false` were never persisted, so there's nothing to restore.
- Document: `superchart.createOverlay({ ..., save: false })` creates an overlay that renders but doesn't persist. Useful for transient indicators (e.g. crosshair-driven measurement, hover annotations).

#### Explicit save/load API on the `Superchart` class
Add four methods, all proxies to the `StorageAdapter` plus state-cache invalidation:

```ts
class Superchart {
  /** Force a save of current chart state. Useful when auto_save_state is disabled or before page navigation. */
  saveState(): Promise<void>

  /** Reload state from the adapter and re-apply to the chart (overlays + indicators + styles). Useful for "revert to saved" UX. */
  loadState(): Promise<void>

  /** Delete the saved record for the current storageKey. Does NOT clear the chart visually. */
  clearState(): Promise<void>

  /** Passthrough to adapter.list(). Returns [] if the adapter doesn't implement it. Used by the multi-chart browser later. */
  listSavedStates(prefix?: string): Promise<StorageEntry[]>
}
```

These wrap `useChartState`'s existing `loadState` / `saveState` / `clearState` and `restoreChartState`.

#### Document the architectural divide
Add a table to `docs/storage.md` and update `PERSISTENCE_ROADMAP.md` glossary:

| Path                                                       | Saves?              | When to use                                                         |
|------------------------------------------------------------|---------------------|---------------------------------------------------------------------|
| Drawing bar (user-drawn shapes)                            | ✅ default          | User intent — fib retracements, trendlines, etc.                    |
| `superchart.createOverlay(...)`                            | ✅ default; `{ save: false }` opts out | Custom overlays from app code that should restore on reload         |
| `superchart.getChart().createOverlay(...)` (direct klinecharts) | ❌                  | Escape hatch when you don't want Superchart's lifecycle             |
| `createOrderLine(chart, ...)`, `createPriceLine(chart, ...)`, `createTradeLine(chart, ...)` (fluent factories) | ❌ deliberately     | Backend-driven visualizations — consumer re-creates on reload from current data |

#### Storybook
- Extend `API/Persistence` with a "Manual save/load" panel: buttons that call `saveState`, `loadState`, `clearState`, `listSavedStates`.
- Add an example overlay created with `save: false` to demonstrate opt-out (e.g. a transient annotation that vanishes on reload).

#### Docs
- Update `docs/storage.md`: add the architectural-divide table; document the explicit API; document `save: false`.
- Add a "When NOT to save" sub-section that explains the fluent-factory rationale.

### Dependencies

- Ticket 1 (the adapter, useChartState, store wiring)

### Acceptance criteria

- [ ] `superchart.saveState/loadState/clearState/listSavedStates` work in the Persistence storybook story
- [ ] An overlay created with `save: false` is rendered, but does not appear in `adapter.load()`'s state and does not restore on reload
- [ ] Order/price/trade lines created via fluent factories are NOT saved (verify by inspecting `adapter.load(key)` — `state.overlays` is empty after creating an order line)
- [ ] `docs/storage.md` includes the architectural-divide table

### Out of scope

- Renaming/duplicating saved states (Ticket 7)
- Periodic auto-save throttling (Ticket 1's behavior is "save on each mutation"; if needed, can be added later by buffering inside `withMergeRetry`)

---

## Ticket 3 — Feature flags (`enabledFeatures` / `disabledFeatures`)

**Status:** TBD

**Description:**
Add a TradingView-style feature-flag system so consumers can opt UI features and behaviors in or out without code changes. Each feature has a documented default; `enabledFeatures` / `disabledFeatures` arrays in `SuperchartOptions` override the defaults. Foundation for templates, the chart browser, and any future opt-in UX.

### Scope

- **Type:**
  ```ts
  type FeatureFlag =
    | 'drawing_bar' | 'period_bar' | 'screenshot_button' | 'fullscreen_button'
    | 'right_click_menu' | 'longpress_menu'
    | 'crosshair_magnet' | 'auto_save_state'
    | 'study_templates' | 'drawing_templates' | 'chart_templates'
    | 'multi_chart_browser'
    | 'volume_in_legend' | 'last_close_price_line'
    | 'symbol_search' | 'period_picker' | 'indicator_picker'
    // … extend as features are added
  ```
- **Defaults table:** maintained in `src/lib/features/defaults.ts`. Every flag MUST appear with a default. Documented in `docs/features.md`.
- **API:**
  ```ts
  interface SuperchartOptions {
    enabledFeatures?: FeatureFlag[]
    disabledFeatures?: FeatureFlag[]
  }
  // runtime
  superchart.isFeatureEnabled(flag)
  superchart.setFeatureEnabled(flag, enabled)  // for power users
  ```
  - Conflict resolution: if a flag is in both arrays, `disabledFeatures` wins (matches TV).
- **Resolution layer:** `useFeature(flag)` React hook reading from per-instance store (added to `ChartStore`).
- **Wire into existing UI:** map current ad-hoc options (`drawingBarVisible`, `periodBarVisible`, etc.) to flags. Keep the legacy options as deprecated aliases for a release; emit a `console.warn` when used.
- **Storybook story:** `API/FeatureFlags` with controls for each flag.

### Dependencies

- Ticket 1 only because some flags (`auto_save_state`, `multi_chart_browser`) interact with persistence; no hard code dependency.
- Ticket 2 is **not** required, but the `auto_save_state` flag's "off" path benefits from Ticket 2's `superchart.saveState()` (so consumers who disable auto-save still have a way to persist).

### Acceptance criteria

- [ ] All listed flags work; defaults match `docs/features.md`
- [ ] Legacy `drawingBarVisible` / `periodBarVisible` options still work (deprecation warning)
- [ ] At least one flag (`right_click_menu`) demonstrates runtime toggling without remount

### Out of scope

- A visual settings editor that exposes flags to end users (consumer's UX choice)

---

## Ticket 4 — Study templates (indicator presets)

**Status:** TBD

**Description:**
Save/load named indicator configurations (e.g. "RSI 14 with my settings"). User can apply a template to any chart. Mirrors TV's study templates.

### Scope

- **Storage extensions:**
  ```ts
  interface StorageAdapter {
    // existing chart-state methods unchanged
    listStudyTemplates?(): Promise<StudyTemplateMeta[]>
    loadStudyTemplate?(name: string): Promise<SavedIndicator | null>
    saveStudyTemplate?(name: string, indicator: SavedIndicator): Promise<void>
    deleteStudyTemplate?(name: string): Promise<void>
  }
  ```
  Optional methods → adapters that don't implement them fail gracefully and the UI hides the templates section.
- **REST contract:** `/study-templates` (GET list, GET/:name, PUT/:name, DELETE/:name). HTTP adapter implements; server adds `study_templates` table.
- **UI:** add a "Save as template / Load template" submenu in the indicator settings modal. Gated by `study_templates` feature flag.
- **Defaults:** ship a small set of bundled study templates as read-only "system" templates (e.g. RSI 14, MACD 12/26/9). Listed by `listStudyTemplates()` with a `system: true` flag.

### Dependencies

- Ticket 1 (StorageAdapter, HttpStorageAdapter, server)
- Ticket 3 (`study_templates` flag)

### Acceptance criteria

- [ ] Save current indicator config → reappears in template list
- [ ] Apply template to a different chart symbol/period → indicator added with saved settings
- [ ] System templates are non-deletable; user templates are
- [ ] Adapters without template methods → templates UI hidden

---

## Ticket 5 — Drawing templates (overlay presets)

**Status:** TBD

**Description:**
Save/load named drawing-tool style presets per tool type. e.g. "My golden trendline" stored under `trendLine`. Mirrors TV's drawing templates.

### Scope

- **Storage extensions:** similar to Ticket 4 but keyed by `(toolName, templateName)`:
  ```ts
  interface StorageAdapter {
    listDrawingTemplates?(toolName: string): Promise<DrawingTemplateMeta[]>
    loadDrawingTemplate?(toolName: string, name: string): Promise<DrawingTemplate | null>
    saveDrawingTemplate?(toolName: string, name: string, template: DrawingTemplate): Promise<void>
    deleteDrawingTemplate?(toolName: string, name: string): Promise<void>
  }
  ```
  `DrawingTemplate` = `{ properties, figureStyles }` only (no points, no chart-specific data).
- **REST contract:** `/drawing-templates/:toolName` (collection) and `/:name` (item).
- **UI:** "Save as default" / "Apply default" buttons in the floating-settings popup (the per-overlay style toolbar). Gated by `drawing_templates` flag.
- **Auto-apply default:** on draw end, if a template named `default` exists for the tool, apply it. Optional, controlled by an inner setting in the templates UI.

### Dependencies

- Ticket 1
- Ticket 3 (`drawing_templates` flag)

### Acceptance criteria

- [ ] Saving fib retracement style → re-applying produces identical visual result on a fresh fib
- [ ] Per-tool isolation: a `default` template for `trendLine` doesn't affect `fibSegment`
- [ ] System defaults shipped for the common tools

---

## Ticket 6 — Chart templates (named layouts)

**Status:** TBD

**Description:**
Save/load entire chart layouts under a name — pane structure, indicators, overlays, prefs. The user's "Scalping setup" or "Swing setup". Distinct from Ticket 1's per-symbol auto-save.

### Scope

- **Storage extensions:**
  ```ts
  interface StorageAdapter {
    listChartTemplates?(): Promise<ChartTemplateMeta[]>
    loadChartTemplate?(name: string): Promise<ChartTemplate | null>
    saveChartTemplate?(name: string, template: ChartTemplate): Promise<void>
    deleteChartTemplate?(name: string): Promise<void>
  }
  ```
  `ChartTemplate` ≈ `ChartState` minus symbol/period (templates are symbol-agnostic).
- **REST contract:** `/chart-templates`. Server adds a table.
- **UI:** "Save layout as template" / "Apply template" entries in the period bar's settings menu. Gated by `chart_templates` flag.
- **Apply semantics:** applying a template to the current chart preserves symbol+period; replaces indicators, overlays, styles, prefs.

### Dependencies

- Ticket 1
- Ticket 3 (`chart_templates` flag)
- Optional: Tickets 4+5 (template-of-templates is fine; templates inside a chart template are stored inline as concrete configs, not refs)

### Acceptance criteria

- [ ] Save layout → switch symbol → apply layout → indicators/overlays restored on the new symbol
- [ ] Applying doesn't reset symbol/period
- [ ] Templates listed in template browser sorted by `savedAt`

---

## Ticket 7 — Multi-chart browser (saved layouts UI)

**Status:** TBD

**Description:**
Provide the "Open chart" UX — list all `(storageKey)` rows the adapter has, let the user open/duplicate/rename/delete. Uses `StorageAdapter.list()` (already exists in the interface but currently unused).

### Scope

- **New methods on `StorageAdapter`:**
  - `renameChart?(oldKey, newKey)` — atomic rename. Optional; if absent, UI implements as load+save+delete.
  - `duplicateChart?(key, newKey)` — atomic duplicate. Optional; same fallback.
- **REST contract:** `POST /chart-state/:key/rename`, `POST /chart-state/:key/duplicate`. Server adds these endpoints.
- **UI:** modal listing all rows from `list()`. Each row: name (storageKey or a friendlier label from `state.metadata`), symbol, period, savedAt. Buttons: Open / Rename / Duplicate / Delete.
- **Add `metadata.name` field to ChartState** (optional, displayed in browser; falls back to storageKey if unset).
- **Gated by `multi_chart_browser` flag.**

### Dependencies

- Ticket 1
- Ticket 2 (uses `superchart.listSavedStates()`)
- Ticket 3 (`multi_chart_browser` flag)

### Acceptance criteria

- [ ] Browser shows all saved keys in both LocalStorage and HTTP modes
- [ ] Rename + Duplicate behave atomically (or correctly via fallback)
- [ ] Opening a row swaps the active chart's state without remount

---

## Adapter-or-API decision (for consumers)

Mirroring TV's split:

| Mode | What the consumer provides | Internal class |
|---|---|---|
| **Adapter** | A `StorageAdapter` instance | their own |
| **HTTP API** | `{ httpStorageUrl, httpStorageHeaders? }` in `SuperchartOptions` | `HttpStorageAdapter` (built-in) |

If both are passed, `storageAdapter` wins (explicit > implicit). Document in `docs/storage.md`.

---

## Working order summary

```
Ticket 1 (Persistence + LocalStorage + HTTP + server) ← ALTD-1730 (shipped)
   ↓
Ticket 2 (Save coverage controls + explicit save/load API)
   ↓
Ticket 3 (Feature flags)
   ↓                     ↘
Ticket 4 (Study tpl)   Ticket 5 (Drawing tpl)   Ticket 6 (Chart tpl)
                       ↓
                       Ticket 7 (Multi-chart browser)
```

Tickets 4, 5, 6 can ship in any order after 3; 7 needs Ticket 2's `listSavedStates` API plus at least one of 4-6 (so the browser has something interesting to list besides chart-state).

---

## Future work (not on the immediate roadmap)

### Real-time push / collaborative editing

TradingView's charting library does **not** include a built-in real-time push mechanism for chart state — their save/load adapter is one-shot read/write only. Conflicts are detected at save time (which is exactly what Ticket 1 implements).

If a future use case demands live sync between devices or true collaborative editing, the foundation is already there:
- The merge-retry loop in `useChartState` already handles array-merge by id
- A new optional `StorageAdapter.subscribeChanges?(key, listener)` method could be added without breaking existing adapters
- Transport options to evaluate when the time comes: SSE (simplest, one-way), WebSocket (bidirectional, needed for cursors/presence), polling (`GET /chart-state/:key` every N seconds — closest to TV's drawings-poll pattern)

For full collaborative editing (multi-user cursors, per-field locks, operational transforms / CRDTs) this is a substantial design discussion that should not piggyback on persistence — it needs its own RFC and probably a different storage primitive than `ChartState` blobs.

**Trigger to revisit:** a concrete product requirement for real-time multi-device/multi-user editing.
