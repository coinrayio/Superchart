# API Reference

This page documents every public type exported from the `superchart` package. All signatures are taken directly from the source.

---

## SuperchartOptions

Passed to `new Superchart(options)`.

```typescript
export interface SuperchartOptions {
  // ---- Required ----

  /** DOM element ID string or HTMLElement reference */
  container: string | HTMLElement

  /** Symbol to display on initial load */
  symbol: SymbolInfo

  /** Timeframe to display on initial load */
  period: Period

  /** Data loader created via createDataLoader(datafeed) */
  dataLoader: DataLoader

  // ---- Backend Indicators ----

  /** Provider for server-calculated indicator data */
  indicatorProvider?: IndicatorProvider

  // ---- Storage ----

  /** Adapter for saving/loading chart state */
  storageAdapter?: StorageAdapter

  /**
   * Key used by storageAdapter.save/load.
   * Defaults to symbol.ticker.
   * Use a compound key for per-user or per-layout isolation.
   */
  storageKey?: string

  // ---- Initial State ----

  /** Built-in klinecharts indicator names to show on the candle pane (e.g. ['MA', 'BOLL']) */
  mainIndicators?: string[]

  /** Built-in klinecharts indicator names to show in sub-panes (e.g. ['VOL', 'RSI']) */
  subIndicators?: string[]

  // ---- Customization ----

  /** BCP-47 locale tag. Default: 'en-US' */
  locale?: string

  /** 'light' | 'dark' or a custom theme name. Default: 'light' */
  theme?: 'light' | 'dark' | string

  /** IANA timezone identifier. Default: 'Etc/UTC' */
  timezone?: string

  /** Watermark string (HTML allowed) or a DOM Node rendered on the canvas */
  watermark?: string | Node

  /** Fine-grained style overrides; merged with theme defaults */
  styleOverrides?: DeepPartial<Styles>

  // ---- Script Execution ----

  /** Provider for server-side script compilation and execution */
  scriptProvider?: ScriptProvider

  // ---- UI Toggles ----

  /** Show the drawing toolbar on the left. Default: false */
  drawingBarVisible?: boolean

  /** Show the volume sub-indicator. Default: true */
  showVolume?: boolean

  // ---- Available Options ----

  /**
   * Restrict the period selector to a specific list.
   * Defaults to: 1m, 5m, 15m, 1H, 2H, 4H, D, W, M
   */
  periods?: Period[]

  // ---- Event Callbacks ----

  /** Called when the symbol changes (from UI or API) */
  onSymbolChange?: (symbol: SymbolInfo) => void

  /** Called when the period/interval changes (from UI or API) */
  onPeriodChange?: (period: Period) => void

  /** Called when the visible range changes (scroll, zoom, data load) */
  onVisibleRangeChange?: (range: VisibleTimeRange) => void
}
```

---

## SuperchartApi

Returned via the `onApiReady` callback or accessible directly as methods on the `Superchart` instance.

```typescript
export interface SuperchartApi {
  // ---- Theme & Styles ----

  setTheme(theme: string): void
  getTheme(): string

  /** Merge style overrides into the chart. Accepts DeepPartial<PaneProperties>. */
  setStyles(styles: DeepPartial<PaneProperties>): void
  getStyles(): DeepPartial<PaneProperties>

  // ---- Locale & Timezone ----

  setLocale(locale: string): void
  getLocale(): string

  setTimezone(timezone: string): void
  getTimezone(): string

  // ---- Symbol & Period ----

  setSymbol(symbol: SymbolInfo): void
  getSymbol(): SymbolInfo

  setPeriod(period: Period): void
  getPeriod(): Period

  // ---- Chart Instance ----

  /** Returns the raw klinecharts Chart instance. Use for low-level canvas operations. */
  getChart(): Nullable<Chart>

  // ---- Backend Indicators ----

  /**
   * Returns the backend indicators API.
   * null if no IndicatorProvider was provided.
   */
  getBackendIndicators(): UseBackendIndicatorsReturn | null

  // ---- Script Editor ----

  /**
   * Programmatically open the script editor panel.
   * Only functional when a scriptProvider was configured.
   * @param options.initialCode - Pre-fill the editor with this code.
   * @param options.readOnly    - Open in read-only view mode (inspect server preset code).
   */
  openScriptEditor(options?: { initialCode?: string; readOnly?: boolean }): void

  /** Programmatically close the script editor panel (both normal and read-only modes). */
  closeScriptEditor(): void

  // ---- Utilities ----

  /** Trigger a canvas resize (call after the container changes size). */
  resize(): void

  /**
   * Render the chart to a data URL.
   * @param type  - 'png' | 'jpeg'. Default: 'jpeg'.
   * @param backgroundColor - CSS color for the background. Default: theme bg.
   */
  getScreenshotUrl(type?: 'png' | 'jpeg', backgroundColor?: string): string

  // ---- Overlays ----

  /**
   * Programmatically create an overlay (drawing).
   * @param overlay - OverlayCreate with an optional properties field.
   * @param paneId  - Target pane. Defaults to 'candle_pane'.
   * @returns The overlay ID string, or null on failure.
   */
  createOverlay(
    overlay: OverlayCreate & { properties?: DeepPartial<OverlayProperties> },
    paneId?: string
  ): string | null

  /**
   * Set the overlay interaction mode.
   * 'normal' — select and move overlays
   * 'lock'   — overlays cannot be moved
   */
  setOverlayMode(mode: OverlayMode): void

  // ---- Event Subscriptions ----

  /**
   * Subscribe to symbol changes. Returns an unsubscribe function.
   * Fires for both UI-initiated and API-initiated changes.
   */
  onSymbolChange(callback: (symbol: SymbolInfo) => void): () => void

  /**
   * Subscribe to period/interval changes. Returns an unsubscribe function.
   * Fires for both UI-initiated and API-initiated changes.
   */
  onPeriodChange(callback: (period: Period) => void): () => void

  /**
   * Subscribe to visible range changes (scroll, zoom, data load).
   * Returns an unsubscribe function.
   * Timestamps are in unix seconds.
   */
  onVisibleRangeChange(callback: (range: VisibleTimeRange) => void): () => void

  // ---- Lifecycle ----

  /** Unmount the chart, remove the klinecharts canvas, and reset all state. */
  dispose(): void
}
```

### Event Callbacks

Superchart supports event callbacks for syncing your application state with chart changes. You can register callbacks in two ways:

**1. Constructor options** — pass callbacks when creating the chart:

```typescript
const chart = new Superchart({
  container: 'chart',
  symbol, period, dataLoader,
  onSymbolChange: (symbol) => {
    console.log('Symbol changed to:', symbol.ticker)
  },
  onPeriodChange: (period) => {
    console.log('Period changed to:', period.text)
  },
  onVisibleRangeChange: (range) => {
    console.log('Visible range:', range.from, '-', range.to)
  },
})
```

**2. Subscription methods** — subscribe at any time, returns an unsubscribe function:

```typescript
const unsubSymbol = chart.onSymbolChange((symbol) => {
  TradingTabsController.get()?.activeTab.setCoinraySymbol(symbol)
})

const unsubPeriod = chart.onPeriodChange((period) => {
  TradingTabsController.get()?.activeTab.setResolution(period)
})

const unsubRange = chart.onVisibleRangeChange((range) => {
  // range.from and range.to are unix timestamps in seconds
  const durationSeconds = range.to - range.from
  TradingTabsController.get()?.activeTab.setVisibleRange(range)
})

// Later: stop listening
unsubSymbol()
unsubPeriod()
unsubRange()
```

Both approaches can be combined. Constructor callbacks and subscription callbacks all fire for the same events. All callbacks fire for changes initiated from the UI (e.g. clicking a period button) **and** from the API (e.g. calling `setPeriod()`). Initial values set during construction do **not** trigger callbacks.

### VisibleTimeRange

```typescript
export interface VisibleTimeRange {
  /** Unix timestamp (seconds) of the leftmost visible bar */
  from: number
  /** Unix timestamp (seconds) of the rightmost visible bar */
  to: number
}
```

Compute the visible duration in seconds: `range.to - range.from`. For example, 100 visible 1-minute candles → `6000` seconds.

### UseBackendIndicatorsReturn

The object returned by `getBackendIndicators()`.

```typescript
export interface UseBackendIndicatorsReturn {
  /** All indicator definitions fetched from IndicatorProvider.getAvailableIndicators() */
  availableIndicators: IndicatorDefinition[]

  /** Names of indicators currently active on the chart */
  activeIndicatorNames: string[]

  /** Add an indicator to the chart */
  addBackendIndicator(
    definition: IndicatorDefinition,
    settings?: Record<string, SettingValue>
  ): Promise<void>

  /** Remove an indicator from the chart */
  removeBackendIndicator(indicatorName: string): Promise<void>

  /** Update settings for an active indicator */
  updateBackendSettings(
    indicatorName: string,
    settings: Record<string, SettingValue>
  ): Promise<void>

  /** Look up a running indicator by its business name (e.g. 'RSI') */
  getActiveIndicator(name: string): ActiveIndicator | undefined

  /**
   * Reverse lookup: find an active indicator by its klinecharts template name.
   * Template names are prefixed 'BACKEND_<indicatorId>'.
   */
  getActiveIndicatorByKlinechartsName(klineName: string): ActiveIndicator | undefined

  /** Resubscribe all active indicators after symbol/period changes */
  handleSymbolPeriodChange(): Promise<void>

  /** Restore backend indicators from StorageAdapter on initial load */
  restoreBackendIndicators(): Promise<void>

  /** Unsubscribe and remove all backend indicators */
  disposeAll(): void
}
```

---

## Core Types

### SymbolInfo

```typescript
export interface SymbolInfo {
  /** Unique ticker identifier (e.g. 'BTCUSDT') */
  ticker: string
  /** Decimal places for price display */
  pricePrecision: number
  /** Decimal places for volume display */
  volumePrecision: number
  /** Full display name (e.g. 'Bitcoin / USDT') */
  name?: string
  /** Abbreviated display name */
  shortName?: string
  /** Exchange identifier (e.g. 'BINANCE') */
  exchange?: string
  /** Market category (e.g. 'crypto', 'stock') */
  market?: string
  /** Quote currency (e.g. 'USDT') */
  priceCurrency?: string
  /** URL to a logo image */
  logo?: string
}
```

### Period

```typescript
export interface Period {
  /** Unit type */
  type: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'
  /** Multiplier for the unit */
  span: number
  /** Display label shown in the period bar (e.g. '1H', '4H', 'D') */
  text: string
}
```

#### PERIODS constant

Pre-built Period objects for all standard timeframes:

```typescript
export const PERIODS: Record<string, Period> = {
  '1s':  { type: 'second', span: 1,  text: '1s'  },
  '1m':  { type: 'minute', span: 1,  text: '1m'  },
  '3m':  { type: 'minute', span: 3,  text: '3m'  },
  '5m':  { type: 'minute', span: 5,  text: '5m'  },
  '15m': { type: 'minute', span: 15, text: '15m' },
  '30m': { type: 'minute', span: 30, text: '30m' },
  '1h':  { type: 'hour',   span: 1,  text: '1H'  },
  '2h':  { type: 'hour',   span: 2,  text: '2H'  },
  '4h':  { type: 'hour',   span: 4,  text: '4H'  },
  '6h':  { type: 'hour',   span: 6,  text: '6H'  },
  '12h': { type: 'hour',   span: 12, text: '12H' },
  '1D':  { type: 'day',    span: 1,  text: '1D'  },
  '3D':  { type: 'day',    span: 3,  text: '3D'  },
  '1W':  { type: 'week',   span: 1,  text: '1W'  },
  '1M':  { type: 'month',  span: 1,  text: '1M'  },
}
```

### ChartState

The full serializable state saved and loaded by `StorageAdapter`.

```typescript
export interface ChartState {
  /** Schema version. Currently 1. Used by migrateChartState(). */
  version: number
  /** Active backend indicator references */
  indicators: SavedIndicator[]
  /** Saved drawing overlays */
  overlays: SavedOverlay[]
  /** Style customizations (DeepPartial<Styles> from klinecharts) */
  styles: DeepPartial<Styles>
  /** Pane height layout */
  paneLayout: PaneLayout[]
  /** User preferences */
  preferences: ChartPreferences
  /** Unix ms timestamp of last save */
  savedAt?: number
  /** Symbol ticker this state was saved for */
  symbol?: string
  /** Period text this state was saved for */
  period?: string
}
```

### StorageAdapter

```typescript
export interface StorageAdapter {
  save(key: string, state: ChartState): Promise<void>
  load(key: string): Promise<ChartState | null>
  delete(key: string): Promise<void>
  /** Optional: list all saved keys */
  list?(prefix?: string): Promise<string[]>
}
```

---

## Helper Functions

All exported from the `superchart` package root.

### createDataLoader

```typescript
function createDataLoader(datafeed: Datafeed): SuperchartDataLoader
```

Wraps a TradingView-compatible `Datafeed` into a klinecharts `DataLoader`. Handles symbol caching, period-to-resolution conversion, and period-aligned timestamp computation. Also extends `DataLoader` with `searchSymbols` and `setOnBarsLoaded`.

See [data-loading.md](./data-loading.md) for full details.

### registerOverlay

```typescript
function registerOverlay(template: OverlayTemplate): void
```

Register a custom overlay type. The template defines the overlay name, how many click steps it requires, and how to render its figures. Call before `new Superchart()` or before first use.

See [overlays.md — Custom Overlays](./overlays.md#custom-overlays) for full examples.

### registerFigure

```typescript
function registerFigure(template: FigureTemplate): void
```

Register a custom figure primitive (canvas shape). Custom overlays can reference registered figures by name in their `createPointFigures` return values.

### registerIndicator

```typescript
function registerIndicator(template: IndicatorTemplate): void
```

Register a custom indicator template. The template defines the indicator name, calculation function, and figure rendering.

### createOrderLine

```typescript
function createOrderLine(chart: Chart, options?: Partial<OrderLineProperties>): OrderLine
```

Creates a horizontal price-level overlay with body, quantity, and cancel button sections. Returns a TradingView-compatible fluent API with getter/setter pairs. See [overlays.md](./overlays.md) for the full `OrderLine` interface and `OrderLineProperties`.

### loadLocale

```typescript
function loadLocale(key: string, messages: Record<string, string>): void
```

Register a custom locale. After calling this, pass `key` as the `locale` option or to `setLocale()`.

```typescript
import { loadLocale } from 'superchart'

loadLocale('nl-NL', {
  indicator: 'Indicator',
  drawing: 'Tekenen',
  // ...
})
```

### formatPeriod

```typescript
function formatPeriod(period: BasePeriod): string
```

Converts a `Period` object to a short display string: `{ type: 'hour', span: 4 }` → `'4H'`.

### resolutionToPeriod

```typescript
function resolutionToPeriod(resolution: string): Period
```

Converts a TradingView resolution string (`'1'`, `'60'`, `'1D'`, `'1W'`, `'1M'`) to a `Period` object.

### periodToResolution

```typescript
function periodToResolution(period: BasePeriod): string
```

Inverse of `resolutionToPeriod`. Converts a `Period` to a TradingView resolution string.

---

## Type Glossary

| Type | Source | Description |
|---|---|---|
| `Nullable<T>` | klinecharts | `T \| null` |
| `DeepPartial<T>` | klinecharts | Recursive partial |
| `Chart` | klinecharts | Raw klinecharts chart instance |
| `Styles` | klinecharts | Full chart style tree |
| `OverlayCreate` | klinecharts | Overlay creation options |
| `OverlayTemplate` | klinecharts | Template for defining custom overlay types |
| `OverlayMode` | klinecharts | `'normal' \| 'lock' \| ...` |
| `FigureTemplate` | klinecharts | Template for defining custom figure primitives |
| `IndicatorTemplate` | klinecharts | Template for defining custom indicator types |
| `ProOverlayTemplate` | klinecharts | Extended overlay template with property management |
| `DataLoader` | klinecharts | klinecharts data-loading interface |
| `PaneOptions` | klinecharts | Pane creation options |
| `PaneLayout` | superchart | `{ id, height, minHeight?, state, order }` |
| `SavedIndicator` | superchart | Serialized indicator reference for storage |
| `SavedOverlay` | superchart | Serialized overlay for storage |
| `ChartPreferences` | superchart | `{ showVolume, showCrosshair, showGrid, showLegend, magnetMode, timezone?, locale? }` |
| `SettingValue` | superchart | `number \| boolean \| string` |
| `ActiveIndicator` | superchart | Runtime indicator state (data Map, timestamps, paneId) |
| `VisibleTimeRange` | superchart | `{ from: number, to: number }` — unix timestamps in seconds |
| `PaneProperties` | superchart | `Styles` extended with background gradient fields |
