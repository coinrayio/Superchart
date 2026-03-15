# Data Loading

Superchart uses a two-layer data loading system:

1. **`Datafeed`** — a TradingView-compatible interface that your application implements. It handles fetching OHLCV bars from whatever source you have (REST API, WebSocket, exchange SDK).
2. **`DataLoader`** (`SuperchartDataLoader`) — a klinecharts-compatible adapter created by `createDataLoader(datafeed)`. It is what you pass to `new Superchart({ dataLoader })`.

You never instantiate `DataLoader` directly. You implement `Datafeed` and call `createDataLoader`.

---

## The Datafeed Interface

```typescript
export interface Datafeed {
  onReady(callback: (config: DatafeedConfiguration) => void): void

  searchSymbols(
    userInput: string,
    exchange: string,
    symbolType: string,
    onResult: (results: SearchSymbolResult[]) => void
  ): void

  resolveSymbol(
    symbolName: string,
    onResolve: (symbolInfo: LibrarySymbolInfo) => void,
    onError: (reason: string) => void
  ): void

  getBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: string,
    periodParams: PeriodParams,
    onResult: (bars: Bar[], meta?: HistoryMetadata) => void,
    onError: (reason: string) => void
  ): void

  subscribeBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: string,
    onTick: (bar: Bar) => void,
    subscriberUID: string,
    onResetCacheNeeded?: () => void
  ): void

  unsubscribeBars(subscriberUID: string): void
}
```

### Method responsibilities

#### `onReady(callback)`

Called once when the chart initializes. Invoke `callback` with a `DatafeedConfiguration` describing supported resolutions. Must be called asynchronously (use `setTimeout(..., 0)`).

```typescript
export interface DatafeedConfiguration {
  /** TradingView resolution strings, e.g. ['1', '5', '15', '60', '240', '1D', '1W'] */
  supportedResolutions: string[]
  exchanges?: { value: string; name: string }[]
  symbolsTypes?: { name: string; value: string }[]
  supports_marks?: boolean
  supports_timescale_marks?: boolean
}
```

#### `searchSymbols(userInput, exchange, symbolType, onResult)`

Called when the user types in the symbol search modal. Call `onResult` with matching symbols. Can call `onResult([])` if search is not supported.

```typescript
export interface SearchSymbolResult {
  symbol: string
  full_name: string
  description?: string
  exchange?: string
  type?: string
}
```

#### `resolveSymbol(symbolName, onResolve, onError)`

Called to get full symbol metadata for a given ticker string. The returned `LibrarySymbolInfo.pricescale` controls decimal precision displayed on the y-axis.

```typescript
export interface LibrarySymbolInfo {
  ticker: string
  name: string
  type?: string
  exchange?: string
  timezone?: string
  /** Price scale: 100 = 2 decimals, 1000 = 3 decimals, 100000000 = 8 decimals */
  pricescale: number
  minmov?: number
  has_intraday?: boolean
  has_daily?: boolean
  supported_resolutions?: string[]
  session?: string
  logo?: string
  currency_code?: string
}
```

#### `getBars(symbolInfo, resolution, periodParams, onResult, onError)`

Fetches historical OHLCV bars. `periodParams.firstDataRequest` is `true` on the initial load and `false` when the user scrolls backward. Call `onResult(bars, meta)` with the fetched bars. Set `meta.noData = true` when there is no more historical data to prevent further backward requests.

```typescript
export interface PeriodParams {
  from: number        // Unix seconds
  to: number          // Unix seconds
  countBack: number   // Requested bar count (default: 500)
  firstDataRequest: boolean
}

export interface Bar {
  time: number    // Unix milliseconds
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export interface HistoryMetadata {
  noData?: boolean   // true if no more historical data
  nextTime?: number  // Unix seconds of next available bar
}
```

#### `subscribeBars(symbolInfo, resolution, onTick, subscriberUID)`

Start streaming real-time bar updates. Call `onTick(bar)` on each new tick. The `subscriberUID` is a deterministic string `${ticker}_${resolution}` — use it to identify the subscription.

#### `unsubscribeBars(subscriberUID)`

Stop streaming updates for the given `subscriberUID`.

---

## createDataLoader

```typescript
function createDataLoader(datafeed: Datafeed): SuperchartDataLoader
```

Wraps a `Datafeed` into the klinecharts `DataLoader` interface. The returned object is passed directly to `new Superchart({ dataLoader })`.

**What it does internally:**

- Calls `datafeed.onReady()` on construction.
- Caches resolved symbols (`resolveSymbol` is only called once per ticker).
- Converts `Period` to TradingView resolution strings using `periodToResolution()`.
- Aligns `from`/`to` timestamps to period boundaries (e.g. hourly bars snap to whole hours).
- Tracks active `subscriberUID` strings and cleans them up on `unsubscribeBar`.
- Converts `Bar` objects (TradingView format) to `KLineData` (klinecharts format).

### SuperchartDataLoader

The return type of `createDataLoader`. Extends the klinecharts `DataLoader` with two additional methods:

```typescript
export interface SuperchartDataLoader extends DataLoader {
  /** Delegates to Datafeed.searchSymbols */
  searchSymbols(
    userInput: string,
    exchange: string,
    symbolType: string,
    onResult: (results: SearchSymbolResult[]) => void
  ): void

  /**
   * Register a callback that fires after each successful bar load.
   * The callback receives fromMs — the start of the loaded range in Unix ms.
   * Use this to trigger historical backfill in providers.
   */
  setOnBarsLoaded(callback: (fromMs: number) => void): void
}
```

---

## setOnBarsLoaded — Indicator History Backfill

When a user scrolls backward and older OHLCV bars are loaded, indicator providers need to fetch corresponding historical data. `setOnBarsLoaded` provides this hook.

After calling `createDataLoader`, call `setOnBarsLoaded` with a callback that forwards the timestamp to your providers:

```typescript
import { createDataLoader } from 'superchart'
import { WebSocketIndicatorProvider } from './indicator/WebSocketIndicatorProvider'
import { WebSocketScriptProvider } from './script/WebSocketScriptProvider'

const indicatorProvider = new WebSocketIndicatorProvider('wss://api.example.com/ws')
const scriptProvider = new WebSocketScriptProvider('wss://api.example.com/ws')

const dataLoader = createDataLoader(datafeed)

// Wire the backfill hook
dataLoader.setOnBarsLoaded((fromMs: number) => {
  indicatorProvider.loadHistoryBefore(fromMs)
  scriptProvider.loadHistoryBefore(fromMs)
})
```

Your provider implementations receive `fromMs` and send a `loadHistory` message to the backend. The backend responds with historical `IndicatorDataPoint[]` which are delivered via the `onHistory` handler registered on the subscription.

---

## Full Datafeed Implementation Example

```typescript
import type {
  Datafeed,
  DatafeedConfiguration,
  LibrarySymbolInfo,
  Bar,
  PeriodParams,
  HistoryMetadata,
  SearchSymbolResult,
} from 'superchart'

export class RestDatafeed implements Datafeed {
  constructor(private baseUrl: string) {}

  onReady(callback: (config: DatafeedConfiguration) => void): void {
    setTimeout(() => {
      callback({
        supportedResolutions: ['1', '5', '15', '60', '240', '1D', '1W', '1M'],
      })
    }, 0)
  }

  searchSymbols(
    userInput: string,
    _exchange: string,
    _symbolType: string,
    onResult: (results: SearchSymbolResult[]) => void
  ): void {
    fetch(`${this.baseUrl}/symbols/search?q=${encodeURIComponent(userInput)}`)
      .then(res => res.json())
      .then(data => onResult(data.results ?? []))
      .catch(() => onResult([]))
  }

  resolveSymbol(
    symbolName: string,
    onResolve: (symbolInfo: LibrarySymbolInfo) => void,
    onError: (reason: string) => void
  ): void {
    fetch(`${this.baseUrl}/symbols/${symbolName}`)
      .then(res => {
        if (!res.ok) throw new Error(`Symbol not found: ${symbolName}`)
        return res.json()
      })
      .then(data => onResolve({
        ticker: data.ticker,
        name: data.name,
        pricescale: data.pricescale ?? 100,
        has_intraday: true,
        has_daily: true,
        supported_resolutions: ['1', '5', '15', '60', '240', '1D', '1W', '1M'],
      }))
      .catch(err => onError(err.message))
  }

  getBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: string,
    periodParams: PeriodParams,
    onResult: (bars: Bar[], meta?: HistoryMetadata) => void,
    onError: (reason: string) => void
  ): void {
    const { from, to, countBack } = periodParams
    const url = `${this.baseUrl}/bars?symbol=${symbolInfo.ticker}&resolution=${resolution}&from=${from}&to=${to}&countBack=${countBack}`

    fetch(url)
      .then(res => res.json())
      .then(data => {
        const bars: Bar[] = data.bars.map((b: any) => ({
          time: b.timestamp * 1000, // server returns Unix seconds; convert to ms
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
          volume: b.volume,
        }))
        onResult(bars, { noData: bars.length === 0 })
      })
      .catch(err => onError(err.message))
  }

  private subscriptions = new Map<string, () => void>()

  subscribeBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: string,
    onTick: (bar: Bar) => void,
    subscriberUID: string
  ): void {
    const ws = new WebSocket(`${this.baseUrl.replace('http', 'ws')}/stream?symbol=${symbolInfo.ticker}&resolution=${resolution}`)
    ws.onmessage = (event) => {
      const b = JSON.parse(event.data)
      onTick({
        time: b.timestamp * 1000,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
        volume: b.volume,
      })
    }
    this.subscriptions.set(subscriberUID, () => ws.close())
  }

  unsubscribeBars(subscriberUID: string): void {
    this.subscriptions.get(subscriberUID)?.()
    this.subscriptions.delete(subscriberUID)
  }
}
```

Usage:

```typescript
import { createDataLoader, Superchart, PERIODS } from 'superchart'
import { RestDatafeed } from './RestDatafeed'

const datafeed = new RestDatafeed('https://api.example.com')
const dataLoader = createDataLoader(datafeed)

const chart = new Superchart({
  container: 'chart',
  symbol: { ticker: 'ETHUSDT', pricePrecision: 4, volumePrecision: 2 },
  period: PERIODS['1h'],
  dataLoader,
})
```
