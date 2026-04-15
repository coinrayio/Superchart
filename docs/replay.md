# Replay Engine

The replay engine provides chart playback — time-travel through historical candle
data with step, play, pause, jump, and resolution-change support. It owns the replay
buffer, playback controls, partial candle construction, and all async state management.

Consumers access it via `sc.replay` on the Superchart instance.

```typescript
import type { ReplayEngine, ReplayStatus } from 'superchart'

const sc = new Superchart({ ... })

sc.replay?.setCurrentTime(Date.now() - 24 * 3600_000)
sc.replay?.play(20)
sc.replay?.onReplayStep((candle, direction) => updateUI(candle))
```

`sc.replay` is `null` until the chart finishes mounting. The `ReplayEngine` type is
exported from both `klinecharts` and `superchart`.

---

## Datafeed Prerequisites

The replay engine relies on two `Datafeed` capabilities. Without them, replay will
degrade or fail.

| Capability | Required for | Consequence if missing |
|---|---|---|
| `getBars` with `countBack: 0` and explicit `from`/`to` | Buffer fetches and partial-candle construction (via `DataLoader.getRange`) | **Replay will not work.** `createDataLoader` calls `getBars` with `countBack: 0` to fetch arbitrary ranges. When `countBack === 0`, your `getBars` must use the `from` parameter directly instead of computing it from `countBack`. |
| `getFirstCandleTime(symbolName, resolution, callback)` | `setCurrentTime` validation | Engine skips the "is this timestamp too early?" check — a user can start a session before any data exists, resulting in an empty chart. |

```typescript
export interface Datafeed {
  // ...
  getFirstCandleTime?(
    symbolName: string,
    resolution: string,
    callback: (timestamp: number | null) => void
  ): void
}
```

If your existing `getBars` ignores `from` when `countBack > 0`, that's fine — `from`
only matters in the `countBack === 0` path.

### Unsupported resolutions

Second-resolution periods (e.g. `1s`, `5s`) are rejected by `setCurrentTime` and
`handlePeriodChange` with an `unsupported_resolution` error. Weekly and monthly
resolutions work in theory but depend on your datafeed returning data at those
resolutions; if it doesn't, the engine emits `unsupported_resolution` (or
`no_data_at_time` if the cursor is before the first available candle).

---

## Accessing the engine

```typescript
const sc = new Superchart({ ... })

// sc.replay is null until the chart mounts.
// If you need immediate access, poll:
const interval = setInterval(() => {
  if (sc.replay !== null) {
    clearInterval(interval)
    wireReplayCallbacks(sc.replay)
  }
}, 50)
```

Reading `sc.replay` for the first time also installs an internal listener that
keeps Superchart's signal store in sync when the engine reverts a failed period
change. See [Period changes during replay](#period-changes-during-replay).

---

## ReplayEngine API

```typescript
export interface ReplayEngine {
  setCurrentTime(timestamp: number | null, endTime?: number | null): Promise<void>
  play(speed?: number): void
  pause(): void
  step(): void
  stepBack(): Promise<void>
  playUntil(timestamp: number, speed?: number): void
  getReplayStatus(): ReplayStatus
  getReplayCurrentTime(): number | null
  getReplayEndTime(): number | null
  getReplayBufferLength(): number
  onReplayStatusChange(callback: (status: ReplayStatus) => void): () => void
  onReplayStep(callback: (candle: KLineData, direction: 'forward' | 'back') => void): () => void
  onReplayError(callback: (error: { type: string; detail?: unknown }) => void): () => void
}

export type ReplayStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'finished'
```

### `setCurrentTime(timestamp, endTime?)`

Starts, seeks, or exits a replay session.

- `timestamp` (Unix ms) — the cursor position. Pass `null` to exit replay and
  resume live mode.
- `endTime` (Unix ms, optional) — upper bound for the replay buffer. Defaults
  to `Date.now()` at the moment of the call (captured up front to avoid drift
  across awaits). Use this to replay a fixed historical window.

`setCurrentTime` is async — it fetches history, builds the replay buffer, and
constructs a partial candle if the cursor lands mid-period. The status transitions
through `idle → loading → ready`. Wait for the promise to resolve (or listen to
`onReplayStatusChange`) before calling `play`/`step`.

If validation fails (second resolution, cursor before first candle, empty fetch),
the engine emits `onReplayError` and restores the previous state.

### `play(speed?)`

Starts continuous playback. `speed` is in candles per second (default: keeps
the current speed, initially `1`). Reasonable values: `1, 2, 5, 10, 20, 100, 200, 400`.

Internally the engine accumulates fractional steps via a debt counter, so very
high speeds advance multiple candles per tick rather than capping at the
`setInterval` minimum (`MIN_INTERVAL = 4ms`).

Calling `play` while already playing only updates the speed — the status
callback does not fire again.

### `pause()`

Pauses continuous playback. Status: `playing → paused`. Safe to call from any state.

### `step()`

Advances one candle. Shifts a candle from the buffer, draws it on the chart,
records it for `stepBack`, advances `_replayCurrentTime`, and emits `onReplayStep`
with `direction: 'forward'`. If the buffer is empty, status transitions to
`finished`.

When the next candle has the same timestamp as the last drawn candle (partial
completion), the entry is replaced in place rather than pushed — `stepBack`
will then remove the candle entirely instead of restoring the partial.

### `stepBack()`

Removes the last drawn candle. Async because it may need to fetch sub-resolution
data to construct a boundary partial.

- **Normal stepBack:** pops from `_dataList`, returns the candle to the front of
  the buffer, recomputes `_replayCurrentTime` from the new last candle, emits
  `onReplayStep` with `direction: 'back'`.
- **Boundary stepBack:** if the candle being removed spans `_replayStartTime`
  (the original session start), it is replaced with a partial constructed at
  the start time instead of being removed. The full candle is queued at the
  front of the buffer so the next `step()` completes it. If sub-resolution data
  is unavailable, emits `partial_construction_failed`.

### `playUntil(timestamp, speed?)`

Plays continuously until `getReplayCurrentTime() >= timestamp`, then auto-pauses.
Early-exits if the buffer is empty or the target is already in the past.

### `getReplayStatus()`

Returns the current `ReplayStatus`.

### `getReplayCurrentTime()`

Returns the effective "now" in playback (Unix ms) — the close time of the last
visible candle, or the cursor timestamp when a partial is visible. See
[Current time semantics](#current-time-semantics).

### `getReplayEndTime()`

Returns the upper bound captured when the session started — the second argument
to `setCurrentTime`, or the `Date.now()` that was substituted for it. `null`
when not in replay.

### `getReplayBufferLength()`

Number of candles still in the replay buffer (forward distance to `finished`).
Useful for showing a progress indicator.

### `onReplayStatusChange(callback)`

Subscribe to status transitions. Returns an unsubscribe function.

When status transitions to `ready`, the engine also emits one `onReplayStep`
event with the last candle in `_dataList` and `direction: 'forward'`, so
consumers get the starting price immediately without reaching into `getDataList()`.

### `onReplayStep(callback)`

Fires on each step forward or back. Callback receives `(candle, direction)`
where `direction` is `'forward'` or `'back'`. For boundary stepBack, the emitted
candle is the partial that's now visible, not the popped candle.

### `onReplayError(callback)`

Fires when an operation fails. The error object has a `type` string (a key, not
a user-facing message) and an optional `detail`. Map `type` to your own UI strings:

| `type` | When it fires |
|---|---|
| `unsupported_resolution` | Resolution is `second`, or the period change returned no data and the cursor is not before `firstCandleTime` (likely 1W/1M with no datafeed support) |
| `no_data_at_time` | Cursor timestamp is before the datafeed's first available candle at the current resolution |
| `resolution_change_failed` | `handlePeriodChange` threw an unexpected error; the session has been auto-reverted to the previous period |
| `partial_construction_failed` | Boundary `stepBack` could not construct a partial because sub-resolution `getRange` returned no data |

---

## State Machine

```
idle → loading → ready → playing ⇄ paused → finished
                   ↑        ↓
                   └─ loading ←┘   (setCurrentTime / setPeriod during playback)

Any state → idle                   (setCurrentTime(null) / setSymbol)
```

| Status | Meaning |
|---|---|
| `idle` | No replay session. Chart is in normal live mode. |
| `loading` | Async operations in progress (init fetch, buffer fetch, partial construction). |
| `ready` | Session active, waiting for user action (step/play). |
| `playing` | Continuous playback via `setInterval`. |
| `paused` | Playback paused; can resume or step. |
| `finished` | Buffer exhausted. Can `stepBack` or restart. |

---

## Current Time Semantics

`getReplayCurrentTime()` returns the effective "now" from a time-traveler's
perspective — the moment the user is observing, as if they were watching a live
chart at that point in time.

**Current time = the close time of the last visible candle.**

This is NOT the timestamp of the last drawn candle. A candle's timestamp is its
START time (when the period opens). Its close time is `timestamp + periodDuration`.
The difference matters:

| Last candle timestamp | Period | `getReplayCurrentTime()` |
|---|---|---|
| 09:00 | 1H | 10:00 |
| 08:00 | 4H | 12:00 |
| Apr 2 00:00 | 1D | Apr 3 00:00 |

A time-traveler at 10:00 would see the 09:00 1H candle as the most recent CLOSED
candle. The 10:00 candle hasn't formed yet — it's in the future. So `currentTime
= 10:00` means "I'm at 10:00, the last thing I can see is the completed 09:00 candle."

**Exception: partial candles.** When a partial candle is visible (mid-period
cursor), current time equals the cursor timestamp — the time up to which the
partial has data, not the candle's close time (which hasn't been reached yet).

---

## Partial Candles

A partial candle appears when the cursor doesn't align with a candle boundary —
e.g., switching from 1m to 1H at 09:07 produces a partial 09:00 candle with only
seven minutes of data.

**Construction.** `_fetchSubResolutionPartial` fetches candles at a smaller
resolution and merges them into a single OHLCV entry. The strategy is two-tier:
a coarser resolution covers the bulk of the window and a finer resolution fills
the remainder. The tiers are picked from the active period:

| Active period | Coarse | Fine |
|---|---|---|
| `year` | 1 month | 1 day |
| `month` / `week` | 1 day | 1 hour |
| `day` | 1 hour | 1 minute |
| `hour` (≥4) | 1 hour | 1 minute |
| `hour` (<4) | 15 minutes | 1 minute |
| `minute` | (none) | 1 minute |
| `second` | — | (sub-resolution fetch skipped) |

**Lifecycle.** The partial is shown immediately when the session enters `ready`.
The first `step()` forward completes it via in-place update (the full candle
shares the partial's timestamp). After completion, no partial state is preserved
— `stepBack` removes the candle entirely.

**Boundary partials.** When `stepBack` would pull current time before
`_replayStartTime`, the candle is replaced with a new partial constructed at
`_replayStartTime`. This represents the candle's state at session start.
Stepping forward from it completes it normally. The full candle is held at
the front of the buffer so completion is still possible.

If sub-resolution data is unavailable, the engine emits
`partial_construction_failed` and the full candle remains visible as a fallback.

---

## Period changes during replay

When the user changes period during an active session, Superchart's `setPeriod`
delegates to the engine's internal `handlePeriodChange`. **You do not call any
replay method** — just `sc.setPeriod(newPeriod)` as usual.

Internally:

1. Cancel any in-flight playback interval and bump the generation counter.
2. Reject second-resolution immediately with `unsupported_resolution`.
3. Snapshot the previous period, limit, buffer, and drawn-history so the
   session can be restored on failure.
4. Advance `_currentTimeLimit` to the actual playback position (`_replayCurrentTime`)
   — not the last drawn candle's close time, which would overshoot for partials.
5. Clear buffer and drawn history; set status `loading`.
6. Re-fetch via `Store.resetData`, which triggers an init load at the new period.
7. After init completes:
   - If the fetched data is empty or contains candles after the cursor, emit
     either `unsupported_resolution` or `no_data_at_time` (disambiguated via
     `getFirstCandleTime`), restore the snapshot, and re-fetch the previous
     period.
   - Otherwise, fetch the new replay buffer, run `_postProcessDataBoundary`,
     re-track extra candles past `_replayStartTime`, and transition to `ready`.
8. Any thrown error during this flow emits `resolution_change_failed` and
   reverts to the previous period.

### Period revert sync

Superchart automatically syncs its signal store back to the reverted period
via an internal `onReplayError` listener registered when you first read
`sc.replay` (see `Superchart._setupReplayErrorSync`). If your app holds its own
period state outside Superchart's store, subscribe to `onReplayError` and react
to `resolution_change_failed`:

```typescript
sc.replay.onReplayError((error) => {
  if (error.type === 'resolution_change_failed') {
    const enginePeriod = sc.getChart()?.getPeriod()
    if (enginePeriod) {
      myAppState.setPeriod(enginePeriod)
    }
  }
})
```

---

## Symbol changes during replay

Calling `sc.setSymbol(newSymbol)` while replay is active automatically calls
the engine's `exitPlayback()` before the symbol change. Status transitions to
`idle` and the chart resumes live mode. You don't need to call
`setCurrentTime(null)` first.

---

## Exiting replay

```typescript
// Explicit exit — clears all replay state, re-fetches live data
await sc.replay.setCurrentTime(null)
```

`exitPlayback()` clears the play interval, buffer, drawn history, start time,
current time, and end time, then sets status to `idle`. `Store.resetData` is
called immediately afterwards to resume live data flow.

---

## What to disable during replay

The engine handles data isolation (blocks live `update` candles from
`subscribeBar`, skips subscriptions during init in replay mode), but your UI
should reflect that the user is in a historical context:

- **Live price ticker / current-price display** — hide or freeze; the chart
  shows historical data, not the current market.
- **Order placement** — disable, or gate behind a confirmation; the displayed
  price is historical.
- **Alerts based on chart price** — suppress, or clearly label as replay prices.
- **"Go to live" / "Jump to now" button** — provide one so users can exit
  replay easily.

---

## Internals

This section documents how the engine ties into the underlying chart store.
Consumers don't need to read it; it's here so contributors can reason about
edits without re-deriving the design.

### Store integration

`ReplayEngine` is a standalone class instantiated by `Store` in its constructor.
It holds a direct reference to the store and accesses its methods/fields through
a narrow `StoreAccess` type declared locally in `ReplayEngine.ts`. Keeping the
type local means Store-internal changes surface as compile errors here (the
replay dev's playground) rather than leaking into `Store.ts`.

The store integrates the engine through five hooks:

1. **`setSymbol`** — checks `isInReplay()`, calls `exitPlayback()` before the
   symbol change.
2. **`setPeriod`** — checks `isInReplay()`, delegates to `handlePeriodChange()`.
3. **`_addData` guard** — blocks live `'update'` candles when `isInReplay()`,
   preventing `subscribeBar` ticks from reaching the chart during replay. The
   engine bypasses this guard for its own draws by saving and restoring
   `_currentTimeLimit` around the `_addData` call.
4. **`_addData` layout suppression** — skips layout during init in replay mode,
   so partial candles can be constructed before the first paint and don't flicker.
5. **`_processDataLoad`** — in replay mode uses `_currentTimeLimit` as the init
   timestamp, skips `subscribeBar`, and notifies the engine via
   `notifyInitComplete()`.

`Store.destroy()` calls `ReplayEngine.destroy()` which clears the play interval,
all callback sets, the pending init promise, and internal buffers.

### Data flow: starting a session

`setCurrentTime(timestamp, endTime?)`:

1. Increment `_generation` (cancels any in-flight async operations).
2. Save `prevLimit`/`prevStatus`; clear play interval; status → `loading`.
3. `_processDataUnsubscribe()` — drop the live tick subscription.
4. Set `_currentTimeLimit = timestamp` and `_replayEndTime = endTime ?? Date.now()`
   (captured up-front to avoid drift across awaits).
5. Reject second-resolution → restore previous state, emit `unsupported_resolution`.
6. Validate against `getFirstCandleTime`. On failure → restore, emit `no_data_at_time`.
7. Re-fetch history via `_waitForInit`, which sets `_loading = false` and calls
   `_processDataLoad('init')`. This goes through `_addData('init') → _clearData()`
   so visible range, scroll position, and indicator state all reset cleanly.
   (An earlier splice-based optimization was removed because it left stale
   internal state and live candles remained visible until the user interacted.)
8. Clear drawn history, fetch the replay buffer via `_fetchReplayBuffer`, then
   run `_postProcessDataBoundary` to handle the last loaded candle:
   - **Case 1 (fully closed):** keep as-is, trigger deferred layout.
   - **Case 2 (just opened at cursor):** pop from `_dataList`, queue at front of
     buffer.
   - **Case 3 (mid-candle):** construct a partial via `_fetchSubResolutionPartial`,
     replace the candle in `_dataList`, push the partial to `_drawnFromBuffer`,
     queue the original candle at the front of the buffer with its original
     timestamp so the next `step()` completes it in place.
9. If both `_dataList` and the buffer are empty, restore previous state and
   emit `unsupported_resolution`.
10. Reset `_replayStartTime` if entering a fresh session that starts earlier
    than the previously-recorded start. (Intra-session seeks via the same
    `_replayStartTime` are still safe because they always seek forward.) The
    earlier `??=` semantics caused phantom partials when a consumer started a
    new session at an earlier time without first calling `setCurrentTime(null)`.
11. `_trackExtraCandlesBeyondStart()` — walk `_dataList` from the end, push any
    candle whose close time is after `_replayStartTime` into `_drawnFromBuffer`
    so `stepBack` can remove it. Skips entries already pushed by
    `_postProcessDataBoundary` (the partial).
12. `_replayCurrentTime = timestamp`; status → `ready`. The `ready` transition
    also emits an initial `onReplayStep` with the last candle so consumers get
    the starting price.

### Generation counter

`_generation` is incremented at the start of `setCurrentTime` and
`handlePeriodChange`. After each `await` in those methods, the code checks if
the generation still matches the captured value. If it doesn't, a newer
operation has started — the current one aborts silently. This prevents race
conditions when the user rapidly clicks "Jump" or changes resolution while a
fetch is still in flight. `_fetchSubResolutionPartial` and
`_postProcessDataBoundary` both accept an optional `gen` parameter so they can
participate in the same cancellation chain.

---

## Full Example

```typescript
import { Superchart, createDataLoader } from 'superchart'
import type { ReplayEngine, ReplayStatus } from 'superchart'
import { myDatafeed } from './myDatafeed' // must support countBack: 0

const sc = new Superchart({
  container: '#chart',
  dataLoader: createDataLoader(myDatafeed),
  symbol: { ticker: 'BTCUSDT', pricePrecision: 2, volumePrecision: 0 },
  period: { span: 1, type: 'hour', text: '1H' },
})

function wireReplay(engine: ReplayEngine) {
  engine.onReplayStatusChange((status: ReplayStatus) => {
    updateStatusUI(status)
    if (status === 'ready' || status === 'paused') {
      enablePlayButton()
    }
  })

  engine.onReplayStep((candle, direction) => {
    updateTimeDisplay(engine.getReplayCurrentTime())
    updatePriceDisplay(candle.close)
  })

  engine.onReplayError((error) => {
    const messages: Record<string, string> = {
      unsupported_resolution: 'This resolution is not supported for replay.',
      no_data_at_time: 'No data available at this time. Pick a later moment.',
      resolution_change_failed: 'Could not change resolution; reverted.',
      partial_construction_failed: 'Could not build partial candle.',
    }
    showToast(messages[error.type] ?? 'Replay error')
  })
}

// Wait for chart mount, then wire up
const poll = setInterval(() => {
  if (sc.replay) {
    clearInterval(poll)
    wireReplay(sc.replay)
  }
}, 50)

// Start a replay window from 24h ago to 1h ago
async function startReplay() {
  const oneHourAgo = Date.now() - 3600_000
  const oneDayAgo = Date.now() - 24 * 3600_000
  await sc.replay?.setCurrentTime(oneDayAgo, oneHourAgo)
  sc.replay?.play(20) // 20 candles/sec
}

// Jump to a specific time, then auto-pause an hour later
async function jumpAndPause(targetMs: number) {
  await sc.replay?.setCurrentTime(targetMs)
  sc.replay?.playUntil(targetMs + 3600_000, 50)
}

// Exit replay
async function exitReplay() {
  await sc.replay?.setCurrentTime(null)
}
```
