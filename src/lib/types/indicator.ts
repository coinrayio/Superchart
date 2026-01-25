/**
 * Indicator types for backend-driven indicators.
 *
 * Superchart doesn't calculate indicators - it receives pre-calculated data
 * from a backend service. These types define the contract between the
 * library and the indicator provider.
 */

import type { Period, SymbolInfo } from 'klinecharts'

/**
 * Indicator provider interface.
 *
 * Implement this to connect Superchart to your indicator calculation backend.
 * The provider handles all communication with your backend service.
 *
 * @example
 * ```typescript
 * const indicatorProvider: IndicatorProvider = {
 *   async getAvailableIndicators() {
 *     const res = await fetch('/api/indicators')
 *     return res.json()
 *   },
 *   async subscribe({ indicatorName, symbol, period, settings }) {
 *     // Connect to WebSocket or start polling
 *     const ws = new WebSocket('wss://indicators.example.com')
 *     // ... setup message handlers
 *     return {
 *       indicatorId: 'ind_123',
 *       metadata: await getMetadata(indicatorName),
 *       onData: (handler) => { dataHandler = handler },
 *       onTick: (handler) => { tickHandler = handler },
 *     }
 *   },
 *   // ...
 * }
 * ```
 */
export interface IndicatorProvider {
  /**
   * Get list of available indicators from backend.
   * Called once on initialization to populate the indicator modal.
   */
  getAvailableIndicators(): Promise<IndicatorDefinition[]>

  /**
   * Subscribe to an indicator for the given symbol/period.
   * Backend should start sending data for this indicator.
   *
   * @returns Subscription object with callbacks for receiving data
   */
  subscribe(params: IndicatorSubscribeParams): Promise<IndicatorSubscription>

  /**
   * Update indicator settings.
   * Backend should recalculate with new parameters.
   */
  updateSettings(indicatorId: string, settings: Record<string, SettingValue>): Promise<void>

  /**
   * Unsubscribe from an indicator.
   * Backend should stop sending data for this indicator.
   */
  unsubscribe(indicatorId: string): Promise<void>

  /**
   * Optional: Called when symbol or period changes.
   * Provider can batch resubscribe all active indicators.
   */
  onSymbolPeriodChange?(
    symbol: SymbolInfo,
    period: Period,
    activeIndicators: { indicatorId: string; name: string; settings: Record<string, SettingValue> }[]
  ): Promise<void>

  /**
   * Optional: Called when the chart is destroyed.
   * Clean up all subscriptions.
   */
  dispose?(): void
}

/**
 * Indicator definition from the backend.
 * Describes an indicator type that can be added to the chart.
 */
export interface IndicatorDefinition {
  /** Unique indicator type name (e.g., "RSI", "MACD") */
  name: string

  /** Short display name */
  shortName: string

  /** Full description */
  description?: string

  /** Category for grouping in UI (e.g., "Trend", "Oscillator", "Volume") */
  category: IndicatorCategory

  /** Default settings for this indicator */
  defaultSettings: Record<string, SettingValue>

  /** Pane where indicator should be displayed */
  paneId: 'candle_pane' | string

  /** Whether this indicator overlays on price (vs separate pane) */
  isOverlay?: boolean
}

export type IndicatorCategory =
  | 'trend'
  | 'oscillator'
  | 'momentum'
  | 'volume'
  | 'volatility'
  | 'moving_average'
  | 'custom'

/**
 * Parameters for subscribing to an indicator
 */
export interface IndicatorSubscribeParams {
  /** Indicator type name */
  indicatorName: string

  /** Symbol to calculate for */
  symbol: SymbolInfo

  /** Time period */
  period: Period

  /** User-configured settings */
  settings: Record<string, SettingValue>
}

/**
 * Active indicator subscription
 */
export interface IndicatorSubscription {
  /** Unique subscription ID from backend */
  indicatorId: string

  /** Indicator metadata describing how to render */
  metadata: IndicatorMetadata

  /**
   * Register handler for receiving initial/full data updates.
   * Called when indicator is first subscribed or settings change.
   */
  onData(handler: IndicatorDataHandler): void

  /**
   * Register handler for receiving real-time tick updates.
   * Called on each new candle or candle update.
   */
  onTick(handler: IndicatorTickHandler): void

  /**
   * Register error handler
   */
  onError?(handler: (error: Error) => void): void
}

export type IndicatorDataHandler = (data: IndicatorDataPoint[]) => void
export type IndicatorTickHandler = (data: IndicatorDataPoint) => void

/**
 * Metadata describing an indicator's visual appearance.
 * Sent once when indicator is subscribed.
 */
export interface IndicatorMetadata {
  /** Indicator type name */
  name: string

  /** Short display name for legends */
  shortName: string

  /** Decimal precision for values */
  precision: number

  /** Pane ID ('candle_pane' for overlays, unique ID for separate pane) */
  paneId: string

  /** Visual plot definitions */
  plots: IndicatorPlot[]

  /** Configurable settings */
  settings: IndicatorSettingDef[]

  /** Fixed Y-axis minimum (e.g., 0 for RSI) */
  minValue?: number

  /** Fixed Y-axis maximum (e.g., 100 for RSI) */
  maxValue?: number

  /** Whether the y-axis should be logarithmic */
  logarithmic?: boolean
}

/**
 * Plot types matching TradingView/PineScript conventions
 */
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

/**
 * Line plot - standard indicator lines
 */
export interface PlotLine {
  type: 'plot'
  id: string
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

/**
 * Histogram plot - vertical bars
 */
export interface PlotHistogram {
  type: 'histogram'
  id: string
  title: string
  color: string
  histBase?: number
}

/**
 * Horizontal reference line
 */
export interface PlotHLine {
  type: 'hline'
  id: string
  price: number
  color: string
  lineStyle?: 'solid' | 'dashed' | 'dotted'
  lineWidth?: number
  title?: string
}

/**
 * Shape markers (triangles, circles, etc.)
 */
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
  | 'triangleup'
  | 'triangledown'
  | 'circle'
  | 'cross'
  | 'xcross'
  | 'diamond'
  | 'flag'
  | 'label_up'
  | 'label_down'
  | 'arrowup'
  | 'arrowdown'
  | 'square'

export type PlotShapeLocation =
  | 'abovebar'
  | 'belowbar'
  | 'top'
  | 'bottom'
  | 'absolute'

export type PlotShapeSize = 'tiny' | 'small' | 'normal' | 'large' | 'huge'

/**
 * Character markers
 */
export interface PlotChar {
  type: 'plotchar'
  id: string
  char: string
  location: PlotShapeLocation
  color: string
  size?: PlotShapeSize
  offset?: number
}

/**
 * Fill between two plots
 */
export interface PlotFill {
  type: 'fill'
  id: string
  plot1: string
  plot2: string
  color: string
  transparency?: number
  title?: string
}

/**
 * Background color per bar
 */
export interface PlotBgColor {
  type: 'bgcolor'
  id: string
  color: string
  transparency?: number
  title?: string
}

/**
 * OHLC candles (for indicators that render candles)
 */
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

/**
 * Directional arrows
 */
export interface PlotArrow {
  type: 'plotarrow'
  id: string
  colorUp: string
  colorDown: string
  offset?: number
  minHeight?: number
  maxHeight?: number
}

/**
 * Single data point for an indicator
 */
export interface IndicatorDataPoint {
  /** Unix timestamp in milliseconds */
  timestamp: number

  /** Plot values: plotId -> value (null for empty) */
  values: Record<string, number | null>

  /** Optional: per-bar dynamic colors (plotId -> color) */
  colors?: Record<string, string>

  /** Optional: whether to show shapes (plotId -> show) */
  shapes?: Record<string, boolean>

  /** Optional: text labels (plotId -> text) */
  texts?: Record<string, string>

  /** Optional: OHLC data for plotcandle (plotId -> OHLC) */
  ohlc?: Record<string, { open: number; high: number; low: number; close: number }>

  /** Optional: background color for this bar */
  bgcolor?: string
}

/**
 * Indicator setting definition
 */
export interface IndicatorSettingDef {
  id: string
  name: string
  type: IndicatorSettingType
  defaultValue: SettingValue
  min?: number
  max?: number
  step?: number
  options?: SettingOption[]
  group?: string
}

export type IndicatorSettingType = 'number' | 'boolean' | 'string' | 'color' | 'select'
export type SettingValue = number | boolean | string

export interface SettingOption {
  value: string
  label: string
}

/**
 * Active indicator state (runtime)
 */
export interface ActiveIndicator {
  /** Unique subscription ID */
  indicatorId: string

  /** Indicator type name */
  name: string

  /** Indicator metadata */
  metadata: IndicatorMetadata

  /** Current settings */
  settings: Record<string, SettingValue>

  /** Current data (timestamp-indexed) */
  data: Map<number, IndicatorDataPoint>

  /** Sorted timestamps for efficient range queries */
  timestamps: number[]

  /** Whether currently visible */
  visible: boolean

  /** Associated pane ID in chart */
  paneId: string

  /** KlineCharts internal indicator ID */
  chartIndicatorId?: string
}
