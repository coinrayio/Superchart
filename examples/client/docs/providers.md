# Providers and Data Flow

The client uses three provider layers that connect Superchart to external data sources. Each provider is a separate class, independently testable and replaceable.

---

## Overview

| Provider | Source file | Purpose |
|---|---|---|
| `CoinrayDatafeed` | `src/datafeed/CoinrayDatafeed.ts` | Fetches OHLCV market data from Coinray API |
| `WebSocketScriptProvider` | `src/script/WebSocketScriptProvider.ts` | Compiles and executes user-written Pine Script via the script server |
| `WebSocketIndicatorProvider` | `src/indicator/WebSocketIndicatorProvider.ts` | Lists and executes server-preset indicators via the script server |

The `dataLoader` created by `createDataLoader(datafeed)` bridges `CoinrayDatafeed` with Superchart's internal bar loading pipeline.

---

## Section 1: CoinrayDatafeed

`CoinrayDatafeed` implements the `Datafeed` interface from `@superchart/types/datafeed`. This is the same interface shape as the TradingView Charting Library datafeed.

### Constructor

```typescript
const datafeed = new CoinrayDatafeed(coinrayToken: string)
```

A module-level singleton `Coinray` instance is created on first use and shared across all method calls. The token refresh handler returns the same token — replace this with a real auth endpoint in production.

### Methods

#### `onReady(callback)`

Called by Superchart once on initialization. Fires the callback (asynchronously via `setTimeout`) with the datafeed configuration:

```typescript
{
  supportedResolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W', '1M'],
  supports_marks: false,
  supports_timescale_marks: false,
}
```

#### `resolveSymbol(symbolName, onResolve, onError)`

Parses the Coinray symbol format `EXCHANGE_QUOTE_BASE` (e.g., `BINA_USDT_BTC`) and fires `onResolve` with a `LibrarySymbolInfo` object. Returns an error if the symbol does not contain exactly two underscores.

Resolved symbol fields:

```typescript
{
  ticker: 'BINA_USDT_BTC',
  name: 'BTC/USDT',           // base/quote
  type: 'crypto',
  exchange: 'BINA',
  timezone: 'Etc/UTC',
  pricescale: 100,            // 2 decimal places
  minmov: 1,
  has_intraday: true,
  has_daily: true,
  supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W', '1M'],
  session: '24x7',
}
```

#### `getBars(symbolInfo, resolution, periodParams, onResult, onError)`

Fetches historical candles from Coinray. Uses `periodParams.countBack` and `periodParams.to` (both in seconds) to compute the start/end window.

**Resolution mapping:**

| Superchart resolution | Coinray resolution | Interval |
|---|---|---|
| `'1'` | `'1'` | 1 minute |
| `'5'` | `'5'` | 5 minutes |
| `'15'` | `'15'` | 15 minutes |
| `'30'` | `'30'` | 30 minutes |
| `'60'` | `'60'` | 1 hour |
| `'240'` | `'240'` | 4 hours |
| `'1D'` | `'D'` | 1 day |
| `'1W'` | `'W'` | 1 week |
| `'1M'` | `'M'` | 1 month (~30 days) |

Bars are returned sorted ascending by time. If the response is empty, `noData: true` is set in the metadata.

#### `subscribeBars(symbolInfo, resolution, onTick, listenerGuid)`

Opens a real-time Coinray candle subscription. Each incoming candle payload fires `onTick(bar)`. The unsubscribe function is stored in `this.subscriptions` keyed by `listenerGuid`.

#### `unsubscribeBars(listenerGuid)`

Calls the stored unsubscribe function and removes the entry from the map.

#### `dispose()`

Calls `unsubscribeBars` for all active subscriptions. Call this in the React `useEffect` cleanup.

---

## Section 2: `createDataLoader` and `setOnBarsLoaded`

```typescript
import { createDataLoader } from '@superchart/index'

const dataLoader = createDataLoader(datafeed)
```

`createDataLoader` wraps a `Datafeed` instance in the `DataLoader` interface that Superchart uses internally. The data loader handles the bar loading lifecycle: initial load, subsequent scroll-left loads, and real-time updates.

### `setOnBarsLoaded(callback)`

```typescript
dataLoader.setOnBarsLoaded((fromMs: number) => {
  scriptProvider.loadHistoryBefore(fromMs)
  indicatorProvider.loadHistoryBefore(fromMs)
})
```

This callback fires when Superchart loads a new batch of older bars (user scrolled left past the oldest loaded candle). The argument `fromMs` is the Unix millisecond timestamp of the oldest newly loaded bar.

The callback must call `loadHistoryBefore(fromMs)` on both providers. This sends `loadHistory` WebSocket messages to the server, which fetches older candles, re-executes the indicator scripts from the beginning, and returns corrected data points for the extended window.

**Why the full re-execution is necessary:** Technical indicators with warmup periods (RSI with period 14, EMA with period 50, etc.) produce incorrect values at the start of any candle window. When new older candles are prepended, the warmup period for the previous oldest bar is now calculable from the extended history. The server re-runs the entire series and sends all data points back. The client's `onHistory` handler merges them by timestamp, overwriting stale boundary values with corrected ones.

---

## Section 3: WebSocketScriptProvider

`WebSocketScriptProvider` implements the `ScriptProvider` interface from `@superchart/types/script`. It handles user-written Pine Script — code typed in the built-in editor.

### Constructor

```typescript
const scriptProvider = new WebSocketScriptProvider(serverUrl: string)
```

Opens a WebSocket connection to `serverUrl` immediately. Auto-reconnects after 3 seconds on disconnect.

### Internal State

- **`pendingRequests`** — `Map<requestId, { resolve, reject }>`. Each outgoing request is stored here with a 30-second timeout.
- **`activeSubscriptions`** — `Map<scriptId, HandlerState>`. Stores registered event handlers and data buffers for each active execution.

### Buffer-Replay Pattern

There is an inherent race condition: the server may send `indicatorData` before the client code has called `.onData(handler)` on the returned `IndicatorSubscription`. The provider handles this by buffering incoming data until handlers are registered, then replaying the buffer immediately when a handler is attached.

```typescript
// Internal storage per scriptId:
{
  onDataHandler?: IndicatorDataHandler
  onTickHandler?: IndicatorTickHandler
  onHistoryHandler?: IndicatorDataHandler
  onErrorHandler?: (error: Error) => void
  bufferedData: IndicatorDataPoint[][]
  bufferedTicks: IndicatorDataPoint[]
  bufferedHistory: IndicatorDataPoint[][]
}
```

### Public Methods

#### `compile(code, language): Promise<ScriptCompileResult>`

Sends a `compile` message to the server and returns a promise that resolves with the compile result.

```typescript
const result = await scriptProvider.compile(myPineScript, 'pine')
if (!result.success) {
  result.errors.forEach(e => console.error(`Line ${e.line}: ${e.message}`))
}
```

The result object:
```typescript
interface ScriptCompileResult {
  success: boolean
  errors: ScriptDiagnostic[]
  metadata?: IndicatorMetadata
}
```

Used by the script editor to show inline error markers before the user clicks Run.

#### `executeAsIndicator(params): Promise<IndicatorSubscription>`

Sends an `execute` message and returns an `IndicatorSubscription` once the server replies with `subscribeAck`.

```typescript
const params: ScriptExecuteParams = {
  code: '//@version=6\nindicator("RSI")\n...',
  language: 'pine',
  symbol: { ticker: 'BINA_USDT_BTC' },
  period: { type: 'hour', span: 1, text: '1H' },
  settings: { length: 14 },
}

const subscription = await scriptProvider.executeAsIndicator(params)
console.log('scriptId:', subscription.indicatorId)
console.log('metadata:', subscription.metadata)

subscription.onData((dataPoints) => {
  // Called once with all historical points (up to 500)
  console.log(`Received ${dataPoints.length} historical points`)
})

subscription.onTick((point) => {
  // Called on every real-time candle update
  console.log('Tick at', new Date(point.timestamp), point.values)
})

subscription.onHistory((dataPoints) => {
  // Called when loadHistoryBefore triggers a backfill
  // Merge these into the chart by timestamp (they include corrected boundary values)
})

subscription.onError((err) => {
  console.error('Indicator error:', err.message)
})
```

#### `loadHistoryBefore(before: number): void`

Sends `loadHistory` messages to the server for every active `scriptId`. Called from the `dataLoader.setOnBarsLoaded` callback.

```typescript
dataLoader.setOnBarsLoaded((fromMs) => {
  scriptProvider.loadHistoryBefore(fromMs)
})
```

#### `stop(scriptId: string): Promise<void>`

Sends a `stop` message for the given `scriptId` and removes it from `activeSubscriptions`. The server unsubscribes from Coinray and stops sending ticks.

#### `dispose(): void`

Calls `stop()` for all active subscriptions and closes the WebSocket. Call in the React `useEffect` cleanup:

```typescript
return () => {
  scriptProvider.dispose()
}
```

### Complete Example: Compile → Execute → Handle Data

```typescript
const provider = new WebSocketScriptProvider('ws://localhost:8080')

const code = `//@version=6
indicator("Fast RSI", overlay=false)
length = input.int(14, title="Length")
rsiValue = ta.rsi(close, length)
plot(rsiValue, title="RSI", color=color.purple)
hline(70, color=color.red, linestyle=hline.style_dashed)
hline(30, color=color.green, linestyle=hline.style_dashed)`

// Step 1: Compile to check for errors
const compileResult = await provider.compile(code, 'pine')
if (!compileResult.success) {
  throw new Error(compileResult.errors[0].message)
}

// Step 2: Execute
const subscription = await provider.executeAsIndicator({
  code,
  language: 'pine',
  symbol: { ticker: 'BINA_USDT_BTC', pricePrecision: 2 },
  period: { type: 'hour', span: 1, text: '1H' },
  settings: { length: 14 },
})

// Step 3: Register handlers (buffer-replay ensures no data is lost)
subscription.onData((points) => {
  for (const point of points) {
    chart.updateIndicatorPoint(subscription.indicatorId, point)
  }
})

subscription.onTick((point) => {
  chart.updateIndicatorPoint(subscription.indicatorId, point)
})

subscription.onHistory((points) => {
  for (const point of points) {
    chart.updateIndicatorPoint(subscription.indicatorId, point) // overwrites by timestamp
  }
})

// Step 4: Stop when done
await provider.stop(subscription.indicatorId)
```

---

## Section 4: WebSocketIndicatorProvider

`WebSocketIndicatorProvider` implements the `IndicatorProvider` interface from `@superchart/types/indicator`. It handles server-preset indicators — those stored in the server's SQLite database.

### Constructor

```typescript
const indicatorProvider = new WebSocketIndicatorProvider(serverUrl: string)
```

Opens a WebSocket connection immediately. Requests sent before the connection is established are queued in `queuedRequests` and flushed on the `open` event. This is the key difference from `WebSocketScriptProvider` which rejects requests when not connected.

### Public Methods

#### `getAvailableIndicators(): Promise<IndicatorDefinition[]>`

Sends `listIndicators` and returns the full list of preset indicators from the server database. Each element:

```typescript
interface IndicatorDefinition {
  name: string           // Used as the key for subscribe()
  shortName: string
  description?: string
  category: string       // Groups indicators in the browser modal
  paneId: string
  isOverlay: boolean
  defaultSettings: Record<string, SettingValue>
  isNew: boolean         // Show "New" badge
  isUpdated: boolean     // Show "Updated" badge
}
```

Called once during chart initialization to populate the indicator browser modal. Subsequent calls use the cached result from the server (not cached client-side — a fresh request is made each call).

#### `subscribe(params): Promise<IndicatorSubscription>`

Sends `executePreset` to the server. The indicator name must match exactly what `getAvailableIndicators` returned. Returns an `IndicatorSubscription` with the same interface as `WebSocketScriptProvider.executeAsIndicator`.

```typescript
const params: IndicatorSubscribeParams = {
  indicatorName: 'Stochastic',
  symbol: { ticker: 'BINA_USDT_BTC' },
  period: { type: 'hour', span: 1, text: '1H' },
  settings: { periodK: 14, smoothK: 1, periodD: 3 },
}

const subscription = await indicatorProvider.subscribe(params)

subscription.onData((points) => { /* historical data */ })
subscription.onTick((point) => { /* real-time updates */ })
subscription.onHistory((points) => { /* backfill */ })
```

The `IndicatorSubscription` object is identical in shape to the one returned by `WebSocketScriptProvider.executeAsIndicator`:

```typescript
interface IndicatorSubscription {
  indicatorId: string           // The server-assigned scriptId UUID
  metadata: IndicatorMetadata   // Plot config, settings, pane info
  onData(handler: IndicatorDataHandler): void
  onTick(handler: IndicatorTickHandler): void
  onHistory(handler: IndicatorDataHandler): void
  onError(handler: (error: Error) => void): void
}
```

#### `updateSettings(indicatorId, settings): Promise<void>`

Stops the current subscription. The caller is responsible for immediately re-subscribing with the new settings:

```typescript
await indicatorProvider.updateSettings(subscription.indicatorId, newSettings)
// Re-subscribe with new settings:
const newSubscription = await indicatorProvider.subscribe({ ...params, settings: newSettings })
```

#### `unsubscribe(indicatorId): Promise<void>`

Sends a `stop` message and removes the subscription from local state.

#### `loadHistoryBefore(before: number): void`

Same as `WebSocketScriptProvider.loadHistoryBefore` — sends `loadHistory` for all active indicator subscriptions.

#### `getIndicatorCode(indicatorName): Promise<string>`

Fetches the Pine Script source for a named indicator (read-only). Used to display the code in a read-only editor when the user clicks "View Source" on a preset indicator.

```typescript
const sourceCode = await indicatorProvider.getIndicatorCode('Stochastic')
// sourceCode is the full Pine Script string
```

#### `dispose(): void`

Calls `unsubscribe()` for all active subscriptions and closes the WebSocket.

### Subscribe → onData → onTick Example

```typescript
const provider = new WebSocketIndicatorProvider('ws://localhost:8080')

// List available presets
const indicators = await provider.getAvailableIndicators()
console.log(indicators.map(i => i.name))
// ['Bollinger Bands', 'MACD', 'Moving Averages', 'Simple RSI', 'Stochastic', 'TDI']

// Subscribe to Bollinger Bands
const subscription = await provider.subscribe({
  indicatorName: 'Bollinger Bands',
  symbol: { ticker: 'BINA_USDT_BTC', pricePrecision: 2 },
  period: { type: 'hour', span: 1, text: '1H' },
  settings: { length: 20, mult: 2.0 },
})

subscription.onData((points) => {
  // Each point has values for: upper, middle, lower
  const last = points[points.length - 1]
  console.log('BB values:', last.values)
  // { upper: 68450.2, middle: 66100.0, lower: 63749.8 }
})

subscription.onTick((point) => {
  console.log('BB tick:', point.values)
})

// Clean up
await provider.unsubscribe(subscription.indicatorId)
```
