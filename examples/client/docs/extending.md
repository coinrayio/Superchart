# Extending the Client

The client is a reference implementation. Each provider is independently replaceable. Fork `App.tsx`, swap the providers, and adapt from there.

---

## Section 1: Using a Different Market Data Source

Replace `CoinrayDatafeed` with any class that implements the `Datafeed` interface from `@superchart/types/datafeed`.

### Required interface

```typescript
interface Datafeed {
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
    listenerGuid: string
  ): void
  unsubscribeBars(listenerGuid: string): void
}
```

### Example: REST API stub datafeed

```typescript
import type { Datafeed, DatafeedConfiguration, LibrarySymbolInfo, Bar, PeriodParams } from '@superchart/types/datafeed'

export class RestDatafeed implements Datafeed {
  private apiBase: string
  private subscriptions = new Map<string, ReturnType<typeof setInterval>>()

  constructor(apiBase: string) {
    this.apiBase = apiBase
  }

  onReady(callback: (config: DatafeedConfiguration) => void): void {
    setTimeout(() => callback({
      supportedResolutions: ['1', '5', '15', '60', '240', '1D'],
      supports_marks: false,
      supports_timescale_marks: false,
    }), 0)
  }

  searchSymbols(_input: string, _exchange: string, _type: string, onResult: any): void {
    setTimeout(() => onResult([]), 0)
  }

  resolveSymbol(symbolName: string, onResolve: any, _onError: any): void {
    setTimeout(() => onResolve({
      ticker: symbolName,
      name: symbolName,
      type: 'crypto',
      timezone: 'Etc/UTC',
      pricescale: 100,
      minmov: 1,
      has_intraday: true,
      has_daily: true,
      supported_resolutions: ['1', '5', '15', '60', '240', '1D'],
      session: '24x7',
    }), 0)
  }

  getBars(symbolInfo: LibrarySymbolInfo, resolution: string, params: PeriodParams, onResult: any, onError: any): void {
    fetch(`${this.apiBase}/candles?symbol=${symbolInfo.ticker}&resolution=${resolution}&from=${params.from}&to=${params.to}`)
      .then(r => r.json())
      .then((bars: Bar[]) => onResult(bars, { noData: bars.length === 0 }))
      .catch(err => onError(err.message))
  }

  subscribeBars(symbolInfo: LibrarySymbolInfo, resolution: string, onTick: (bar: Bar) => void, listenerGuid: string): void {
    // Poll every 5 seconds as a simple real-time substitute
    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`${this.apiBase}/latest?symbol=${symbolInfo.ticker}&resolution=${resolution}`)
        const bar: Bar = await response.json()
        onTick(bar)
      } catch { /* ignore */ }
    }, 5000)
    this.subscriptions.set(listenerGuid, intervalId)
  }

  unsubscribeBars(listenerGuid: string): void {
    const id = this.subscriptions.get(listenerGuid)
    if (id) clearInterval(id)
    this.subscriptions.delete(listenerGuid)
  }
}
```

### Swapping in `App.tsx`

```typescript
// Replace:
const datafeed = new CoinrayDatafeed(COINRAY_TOKEN)

// With:
const datafeed = new RestDatafeed('https://api.myexchange.com')
```

No other changes are needed. `createDataLoader` and the `setOnBarsLoaded` callback work with any datafeed implementation.

---

## Section 2: Using a Different Script Execution Backend

Replace `WebSocketScriptProvider` with any class that implements the `ScriptProvider` interface from `@superchart/types/script`.

### Required interface

```typescript
interface ScriptProvider {
  compile(code: string, language: string): Promise<ScriptCompileResult>
  executeAsIndicator(params: ScriptExecuteParams): Promise<IndicatorSubscription>
  stop(scriptId: string): Promise<void>
  loadHistoryBefore?(before: number): void
  dispose(): void
}
```

The `IndicatorSubscription` return type must match exactly:

```typescript
interface IndicatorSubscription {
  indicatorId: string
  metadata: IndicatorMetadata
  onData(handler: IndicatorDataHandler): void
  onTick(handler: IndicatorTickHandler): void
  onHistory(handler: IndicatorDataHandler): void
  onError(handler: (error: Error) => void): void
}
```

### Example: Polling-based ScriptProvider using fetch()

```typescript
import type { ScriptProvider, ScriptCompileResult, ScriptExecuteParams } from '@superchart/types/script'
import type { IndicatorSubscription } from '@superchart/types/indicator'

export class PollingScriptProvider implements ScriptProvider {
  private apiBase: string
  private activePollers = new Map<string, ReturnType<typeof setInterval>>()

  constructor(apiBase: string) {
    this.apiBase = apiBase
  }

  async compile(code: string, language: string): Promise<ScriptCompileResult> {
    const response = await fetch(`${this.apiBase}/compile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language }),
    })
    return response.json()
  }

  async executeAsIndicator(params: ScriptExecuteParams): Promise<IndicatorSubscription> {
    const response = await fetch(`${this.apiBase}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    const { scriptId, metadata, data } = await response.json()

    let onDataHandler: any
    let onTickHandler: any
    let bufferedData = [data]

    // Start polling for updates
    const intervalId = setInterval(async () => {
      try {
        const tick = await fetch(`${this.apiBase}/tick/${scriptId}`).then(r => r.json())
        if (onTickHandler) onTickHandler(tick)
      } catch { /* ignore */ }
    }, 3000)
    this.activePollers.set(scriptId, intervalId)

    const subscription: IndicatorSubscription = {
      indicatorId: scriptId,
      metadata,
      onData(handler) {
        onDataHandler = handler
        for (const d of bufferedData) handler(d)
        bufferedData = []
      },
      onTick(handler) { onTickHandler = handler },
      onHistory(handler) { /* not implemented */ },
      onError(handler) { /* not implemented */ },
    }

    return subscription
  }

  async stop(scriptId: string): Promise<void> {
    const poller = this.activePollers.get(scriptId)
    if (poller) clearInterval(poller)
    this.activePollers.delete(scriptId)
    await fetch(`${this.apiBase}/stop/${scriptId}`, { method: 'POST' })
  }

  dispose(): void {
    for (const [id, poller] of this.activePollers) {
      clearInterval(poller)
      this.stop(id).catch(() => {})
    }
    this.activePollers.clear()
  }
}
```

---

## Section 3: Adding UI Features

### Accessing the SuperchartApi

`new Superchart(options)` returns a `Superchart` instance. Use `chart.getChart()` to access the underlying klinecharts instance for advanced operations not covered by the Superchart API:

```typescript
const chart = new Superchart({ container, symbol, period, dataLoader, ... })

// Access the raw klinecharts instance
const klineChart = chart.getChart()

// Subscribe to a klinecharts action
klineChart.subscribeAction('onCrosshairChange', (data) => {
  console.log('Crosshair at:', data)
})
```

### Toolbar integration

Pass a `toolbar` option to render a custom React component in the chart toolbar area:

```typescript
const chart = new Superchart({
  container,
  // ...
  toolbar: document.getElementById('my-custom-toolbar'),
})
```

Or if Superchart accepts a React node:

```tsx
function MyToolbar({ api }: { api: SuperchartApi }) {
  return (
    <div>
      <button onClick={() => api.setTheme('light')}>Light theme</button>
      <button onClick={() => api.setTheme('dark')}>Dark theme</button>
    </div>
  )
}
```

### Listening to chart events

```typescript
const klineChart = chart.getChart()

// Crosshair position changes
klineChart.subscribeAction('onCrosshairChange', (params) => {
  console.log('Crosshair:', params)
})

// Pane size changes
klineChart.subscribeAction('onPaneContentSizeChange', (params) => {
  console.log('Pane resize:', params)
})
```

---

## Section 4: Supporting Multiple Symbols and Charts

Each `Superchart` instance is fully isolated. To render two charts side by side:

```tsx
function MultiChart() {
  const ref1 = useRef<HTMLDivElement>(null)
  const ref2 = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const chart1 = new Superchart({
      container: ref1.current!,
      symbol: { ticker: 'BINA_USDT_BTC' },
      period: { type: 'hour', span: 1, text: '1H' },
      dataLoader: createDataLoader(datafeed),
      scriptProvider: new WebSocketScriptProvider(SCRIPT_SERVER_URL),
      indicatorProvider: new WebSocketIndicatorProvider(SCRIPT_SERVER_URL),
    })

    const chart2 = new Superchart({
      container: ref2.current!,
      symbol: { ticker: 'BINA_USDT_ETH' },
      period: { type: 'minute', span: 15, text: '15m' },
      dataLoader: createDataLoader(datafeed),
      // A single provider instance CAN be shared — each execution
      // gets a unique scriptId from the server
      scriptProvider: sharedScriptProvider,
      indicatorProvider: sharedIndicatorProvider,
    })

    return () => { chart1.dispose(); chart2.dispose() }
  }, [])

  return (
    <div style={{ display: 'flex' }}>
      <div ref={ref1} style={{ width: '50%', height: '600px' }} />
      <div ref={ref2} style={{ width: '50%', height: '600px' }} />
    </div>
  )
}
```

A single `WebSocketScriptProvider` or `WebSocketIndicatorProvider` instance can service multiple charts simultaneously because the server assigns a unique `scriptId` UUID to every `execute`/`executePreset` call. Each chart's indicators are isolated by their `scriptId`.

---

## Section 5: Persisting Chart State

Superchart accepts a `StorageAdapter` for saving and loading chart state (indicators, drawings, settings, zoom level).

### `StorageAdapter` interface

```typescript
interface StorageAdapter {
  save(key: string, state: unknown): Promise<void>
  load(key: string): Promise<unknown | null>
  delete(key: string): Promise<void>
}
```

### localStorage Example (copy-paste ready)

```typescript
const storageAdapter: StorageAdapter = {
  async save(key: string, state: unknown): Promise<void> {
    try {
      localStorage.setItem(`chart_${key}`, JSON.stringify(state))
    } catch (e) {
      console.warn('Failed to save chart state:', e)
    }
  },

  async load(key: string): Promise<unknown | null> {
    const raw = localStorage.getItem(`chart_${key}`)
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  },

  async delete(key: string): Promise<void> {
    localStorage.removeItem(`chart_${key}`)
  },
}
```

### Passing the adapter to Superchart

```typescript
const chart = new Superchart({
  container: containerRef.current,
  symbol: { ticker: 'BINA_USDT_BTC' },
  period: { type: 'hour', span: 1, text: '1H' },
  dataLoader,
  scriptProvider,
  indicatorProvider,
  storageAdapter,
  storageKey: 'BINA_USDT_BTC',  // Key prefix used for all save/load calls
})
```

State is saved automatically when the chart is modified (indicators added/removed, drawings created, settings changed) and loaded on initialization. Use a symbol-specific `storageKey` so each symbol has its own saved layout.

---

## Section 6: Custom Indicator Modal Categories

The indicator browser modal groups server-preset indicators by the `category` field stored in the server's SQLite database.

### How categories flow from the database to the UI

1. The server's `db.ts` stores each indicator with a `category` string (e.g., `'oscillator'`, `'trend'`).
2. `listIndicators` returns `{ ..., category: 'oscillator', ... }` for each indicator.
3. `WebSocketIndicatorProvider.getAvailableIndicators()` maps the server response to `IndicatorDefinition[]` preserving the `category` field.
4. Superchart's indicator modal reads the `category` and creates a group for each unique value it encounters.

### Adding a new category

No code changes are required in the client. Simply use a new category string when inserting an indicator into the server database:

```sql
-- This automatically creates a "Machine Learning" group in the modal
INSERT INTO indicators (id, name, ..., category, ...)
VALUES ('ai_trend', 'AI Trend Detector', ..., 'machine_learning', ...);
```

The new group appears in the indicator browser on next load.

### Category display order

Categories are returned from the server sorted by `category ASC, name ASC` (see `getAllIndicators()` in `db.ts`). The modal renders groups in the order they appear in the response. To control display order, prefix category strings with a sort key (e.g., `'01_trend'`, `'02_oscillator'`) or sort client-side after receiving the list.

### Built-in klinecharts indicators

The modal also shows klinecharts built-in technical indicators (MA, BOLL, MACD, KDJ, etc.) in a separate "Built-in" section. These do not go through the server and cannot be customized via the database.
