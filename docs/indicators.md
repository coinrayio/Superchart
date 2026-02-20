# Backend Indicators

## Philosophy

Superchart never calculates indicator values. All calculation happens on your backend. The library's job is to:

1. Receive pre-calculated `IndicatorDataPoint[]` from your `IndicatorProvider`.
2. Store each data point in an in-memory `Map<timestamp, IndicatorDataPoint>`.
3. Register a klinecharts `IndicatorTemplate` whose `calc()` function reads from that map.
4. Trigger klinecharts to redraw whenever new data arrives.

This architecture is called the **calc bridge**.

---

## IndicatorProvider Interface

```typescript
export interface IndicatorProvider {
  /**
   * Fetch the list of available indicators.
   * Called once on initialization to populate the indicator modal.
   */
  getAvailableIndicators(): Promise<IndicatorDefinition[]>

  /**
   * Subscribe to an indicator for the given symbol and period.
   * The backend should start sending data for this indicator.
   * Returns a subscription object with callbacks for receiving data.
   */
  subscribe(params: IndicatorSubscribeParams): Promise<IndicatorSubscription>

  /**
   * Update user-configured settings for a running subscription.
   * The backend should recalculate with the new parameters.
   */
  updateSettings(
    indicatorId: string,
    settings: Record<string, SettingValue>
  ): Promise<void>

  /**
   * Unsubscribe and stop receiving data for this indicator.
   */
  unsubscribe(indicatorId: string): Promise<void>

  /**
   * Optional. Called when the chart's symbol or period changes.
   * Provides the full list of active indicators so the backend can
   * batch-resubscribe them for the new context.
   * If not implemented, Superchart unsubscribes and resubscribes each indicator individually.
   */
  onSymbolPeriodChange?(
    symbol: SymbolInfo,
    period: Period,
    activeIndicators: {
      indicatorId: string
      name: string
      settings: Record<string, SettingValue>
    }[]
  ): Promise<void>

  /**
   * Optional. Fetch the Pine Script source code for a preset indicator.
   * Used by the read-only script viewer when the user clicks the code icon
   * on an indicator tooltip.
   */
  getIndicatorCode?(indicatorName: string): Promise<string>

  /**
   * Optional. Called when the chart is disposed.
   * Clean up all WebSocket connections and active subscriptions.
   */
  dispose?(): void
}
```

---

## Supporting Types

### IndicatorDefinition

Describes an indicator type available for the user to add.

```typescript
export interface IndicatorDefinition {
  /** Unique type name, e.g. 'RSI' */
  name: string
  /** Short display name, e.g. 'RSI' */
  shortName: string
  description?: string
  /** UI grouping category */
  category: IndicatorCategory
  /** Default settings applied when the user adds the indicator */
  defaultSettings: Record<string, SettingValue>
  /** 'candle_pane' to overlay on price chart; any other ID creates a new sub-pane */
  paneId: 'candle_pane' | string
  /** True if the indicator renders on top of price bars (not in a sub-pane) */
  isOverlay?: boolean
  /** Badge: recently added to the server */
  isNew?: boolean
  /** Badge: recently updated on the server */
  isUpdated?: boolean
}

export type IndicatorCategory =
  | 'trend'
  | 'oscillator'
  | 'momentum'
  | 'volume'
  | 'volatility'
  | 'moving_average'
  | 'custom'
```

### IndicatorSubscribeParams

```typescript
export interface IndicatorSubscribeParams {
  indicatorName: string
  symbol: SymbolInfo
  period: Period
  settings: Record<string, SettingValue>
}
```

### IndicatorSubscription

Returned by `IndicatorProvider.subscribe()`. Superchart registers data handlers on the returned object.

```typescript
export interface IndicatorSubscription {
  /** Unique ID assigned by the backend for this running instance */
  indicatorId: string

  /** Rendering metadata (plots, settings, axes) */
  metadata: IndicatorMetadata

  /**
   * Register the handler for full data updates.
   * Called when the indicator is first subscribed or settings change.
   * Replaces all existing data in the map.
   */
  onData(handler: IndicatorDataHandler): void

  /**
   * Register the handler for real-time tick updates.
   * Called on each new candle or candle update.
   * Merges a single point into the existing map.
   */
  onTick(handler: IndicatorTickHandler): void

  /**
   * Optional. Register the handler for historical backfill data.
   * Called when DataLoader.setOnBarsLoaded fires because the user scrolled back.
   * Data is merged into the existing map — it does NOT replace current data.
   */
  onHistory?(handler: IndicatorDataHandler): void

  /** Optional. Register an error handler. */
  onError?(handler: (error: Error) => void): void
}

export type IndicatorDataHandler = (data: IndicatorDataPoint[]) => void
export type IndicatorTickHandler  = (data: IndicatorDataPoint) => void
```

---

## IndicatorMetadata

Sent once when the subscription is created. Describes how the indicator renders.

```typescript
export interface IndicatorMetadata {
  name: string
  shortName: string
  /** Decimal precision for tooltip values */
  precision: number
  /** 'candle_pane' for price overlay; unique ID for sub-pane */
  paneId: string
  /** Visual plot definitions (see Plot Types below) */
  plots: IndicatorPlot[]
  /** Configurable input settings */
  settings: IndicatorSettingDef[]
  /** Fixed y-axis minimum (e.g. 0 for RSI) */
  minValue?: number
  /** Fixed y-axis maximum (e.g. 100 for RSI) */
  maxValue?: number
  /** Logarithmic y-axis */
  logarithmic?: boolean
}
```

---

## Plot Types

`IndicatorPlot` is a discriminated union. The `type` field selects the variant.

```typescript
export type IndicatorPlot =
  | PlotLine
  | PlotHistogram
  | PlotHLine
  | PlotShape
  | PlotChar
  | PlotFill
  | PlotBgColor
  | PlotCandle
  | PlotArrow
```

### PlotLine — `type: 'plot'`

Standard line or area series.

```typescript
export interface PlotLine {
  type: 'plot'
  id: string      // Used as key in IndicatorDataPoint.values
  title: string
  style: PlotLineStyle
  color: string
  lineWidth?: number
  offset?: number
  transparency?: number
}

export type PlotLineStyle =
  | 'line'
  | 'stepline'
  | 'stepline_diamond'
  | 'circles'
  | 'cross'
  | 'area'
```

### PlotHistogram — `type: 'histogram'`

Vertical bars anchored at `histBase` (default 0).

```typescript
export interface PlotHistogram {
  type: 'histogram'
  id: string
  title: string
  color: string
  histBase?: number
}
```

Per-bar colors are provided via `IndicatorDataPoint.colors[id]`.

### PlotHLine — `type: 'hline'`

A fixed horizontal reference line at a constant price.

```typescript
export interface PlotHLine {
  type: 'hline'
  id: string
  price: number
  color: string
  lineStyle?: 'solid' | 'dashed' | 'dotted'
  lineWidth?: number
  title?: string
}
```

Horizontal lines are rendered via the klinecharts draw callback, not as figure values. No entry in `IndicatorDataPoint.values` is needed.

### PlotShape — `type: 'plotshape'`

Geometric markers positioned relative to bars.

```typescript
export interface PlotShape {
  type: 'plotshape'
  id: string
  style: PlotShapeStyle
  location: PlotShapeLocation
  color: string
  size?: PlotShapeSize
  text?: string
  textColor?: string
  offset?: number
}

export type PlotShapeStyle =
  | 'triangleup' | 'triangledown'
  | 'circle' | 'cross' | 'xcross'
  | 'diamond' | 'flag'
  | 'label_up' | 'label_down'
  | 'arrowup' | 'arrowdown'
  | 'square'

export type PlotShapeLocation =
  | 'abovebar' | 'belowbar'
  | 'top' | 'bottom' | 'absolute'

export type PlotShapeSize =
  | 'tiny' | 'small' | 'normal' | 'large' | 'huge'
```

In `IndicatorDataPoint.values`, set the value to the price (for `absolute`) or any non-null value (for bar-relative positions) to show the shape. Set to `null` to hide.

### PlotChar — `type: 'plotchar'`

A single Unicode character placed at a bar location.

```typescript
export interface PlotChar {
  type: 'plotchar'
  id: string
  char: string              // e.g. '▲', '●', 'B'
  location: PlotShapeLocation
  color: string
  size?: PlotShapeSize
  offset?: number
}
```

### PlotFill — `type: 'fill'`

Fill the area between two `PlotLine` or `PlotHLine` series.

```typescript
export interface PlotFill {
  type: 'fill'
  id: string
  plot1: string             // id of first plot/hline
  plot2: string             // id of second plot/hline
  color: string
  transparency?: number     // 0–100
  title?: string
}
```

Fills are rendered via the draw callback. No `values` entry required.

### PlotBgColor — `type: 'bgcolor'`

Tints the pane background for a specific bar.

```typescript
export interface PlotBgColor {
  type: 'bgcolor'
  id: string
  color: string
  transparency?: number
  title?: string
}
```

Provide per-bar colors via `IndicatorDataPoint.bgcolor`.

### PlotCandle — `type: 'plotcandle'`

Renders a full OHLC candle for each bar.

```typescript
export interface PlotCandle {
  type: 'plotcandle'
  id: string
  colorUp: string
  colorDown: string
  borderUp?: string
  borderDown?: string
  wickUp?: string
  wickDown?: string
  title?: string
}
```

Provide data via `IndicatorDataPoint.ohlc[id]`:

```typescript
ohlc: {
  myCandle: { open: 100, high: 110, low: 95, close: 105 }
}
```

### PlotArrow — `type: 'plotarrow'`

Proportional directional arrows. Positive values render upward arrows, negative values render downward arrows.

```typescript
export interface PlotArrow {
  type: 'plotarrow'
  id: string
  colorUp: string
  colorDown: string
  offset?: number
  minHeight?: number
  maxHeight?: number
}
```

---

## IndicatorDataPoint

The fundamental data unit delivered via `onData` / `onTick` / `onHistory`.

```typescript
export interface IndicatorDataPoint {
  /** Unix milliseconds timestamp matching a chart bar */
  timestamp: number

  /** Plot values keyed by plot id. null = no value for this bar. */
  values: Record<string, number | null>

  /** Per-bar dynamic colors, keyed by plot id */
  colors?: Record<string, string>

  /** Per-bar shape visibility, keyed by plotshape id */
  shapes?: Record<string, boolean>

  /** Per-bar text labels, keyed by plot id */
  texts?: Record<string, string>

  /** Per-bar OHLC data for plotcandle plots */
  ohlc?: Record<string, { open: number; high: number; low: number; close: number }>

  /** Per-bar background color (for bgcolor plots) */
  bgcolor?: string
}
```

---

## IndicatorSettingDef

Describes a user-configurable input that appears in the indicator settings modal.

```typescript
export interface IndicatorSettingDef {
  id: string
  name: string
  type: IndicatorSettingType
  defaultValue: SettingValue
  min?: number
  max?: number
  step?: number
  options?: SettingOption[]   // For type 'select'
  group?: string              // Groups settings under a section header
}

export type IndicatorSettingType = 'number' | 'boolean' | 'string' | 'color' | 'select'
export type SettingValue = number | boolean | string

export interface SettingOption {
  value: string
  label: string
}
```

---

## How the Calc Bridge Works

When `addBackendIndicator(definition, settings)` is called:

1. `IndicatorProvider.subscribe()` is called — the backend starts calculating.
2. A `Map<number, IndicatorDataPoint>` (`dataStore`) is created for this subscription.
3. A klinecharts `IndicatorTemplate` is registered with `registerIndicator({ name, figures, calc })`.
   - `figures` is derived from `metadata.plots` using `translatePlotsToFigures()`.
   - `calc(dataList)` maps each `KLineData` bar by timestamp, looking up the corresponding entry in `dataStore`. Missing entries return `null` for all keys.
4. The indicator is added to the chart with `chart.createIndicator({ name })`.
5. Data handlers are wired:
   - `onData` — clears `dataStore`, fills it with the full dataset, calls `chart.overrideIndicator({ name })` to trigger a redraw.
   - `onTick` — inserts or updates a single entry, then redraws.
   - `onHistory` — merges new data without clearing, then redraws.

---

## IndicatorProvider Example (HTTP Polling)

```typescript
import type {
  IndicatorProvider,
  IndicatorDefinition,
  IndicatorSubscribeParams,
  IndicatorSubscription,
  SettingValue,
} from 'superchart'

export class HttpIndicatorProvider implements IndicatorProvider {
  private activeSubscriptions = new Map<string, ReturnType<typeof setInterval>>()

  async getAvailableIndicators(): Promise<IndicatorDefinition[]> {
    const res = await fetch('/api/indicators')
    return res.json()
  }

  async subscribe(params: IndicatorSubscribeParams): Promise<IndicatorSubscription> {
    // Start a subscription on the backend
    const res = await fetch('/api/indicators/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        indicatorName: params.indicatorName,
        ticker: params.symbol.ticker,
        period: params.period.text,
        settings: params.settings,
      }),
    })
    const { subscriptionId, metadata } = await res.json()

    let dataHandler: ((data: any[]) => void) | null = null
    let tickHandler: ((data: any) => void) | null = null

    // Poll for full data on subscribe
    const fetchData = async () => {
      const r = await fetch(`/api/indicators/${subscriptionId}/data`)
      const data = await r.json()
      dataHandler?.(data)
    }

    // Poll for ticks every 5 seconds
    const intervalId = setInterval(async () => {
      const r = await fetch(`/api/indicators/${subscriptionId}/tick`)
      const tick = await r.json()
      if (tick) tickHandler?.(tick)
    }, 5000)

    this.activeSubscriptions.set(subscriptionId, intervalId)
    fetchData() // initial data load

    return {
      indicatorId: subscriptionId,
      metadata,
      onData(handler) { dataHandler = handler },
      onTick(handler) { tickHandler = handler },
    }
  }

  async updateSettings(indicatorId: string, settings: Record<string, SettingValue>): Promise<void> {
    await fetch(`/api/indicators/${indicatorId}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
  }

  async unsubscribe(indicatorId: string): Promise<void> {
    const intervalId = this.activeSubscriptions.get(indicatorId)
    if (intervalId) {
      clearInterval(intervalId)
      this.activeSubscriptions.delete(indicatorId)
    }
    await fetch(`/api/indicators/${indicatorId}`, { method: 'DELETE' })
  }
}
```

## Handling Symbol/Period Changes

When `onSymbolPeriodChange` is implemented, Superchart calls it instead of individually unsubscribing and resubscribing each indicator. This lets the backend batch the operation more efficiently.

```typescript
async onSymbolPeriodChange(
  symbol: SymbolInfo,
  period: Period,
  activeIndicators: { indicatorId: string; name: string; settings: Record<string, SettingValue> }[]
): Promise<void> {
  // Send a single batch request to the backend
  await fetch('/api/indicators/resubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ticker: symbol.ticker,
      period: period.text,
      indicators: activeIndicators,
    }),
  })
  // The backend sends new data via existing subscription channels.
  // Superchart clears the data stores after this call returns,
  // then refills them when the new onData() callbacks fire.
}
```

If `onSymbolPeriodChange` is not implemented, Superchart calls `unsubscribe()` on each indicator then `subscribe()` again for the new symbol/period.
