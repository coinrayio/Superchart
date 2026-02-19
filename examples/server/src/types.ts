/**
 * Type definitions for the script execution server
 * These match the types defined in superchart's script.ts
 */

export interface SymbolInfo {
  ticker: string
  exchange?: string
  pricePrecision?: number
  volumePrecision?: number
  minPrice?: number
  maxPrice?: number
  minQuantity?: number
  maxQuantity?: number
}

export interface Period {
  /** klinecharts format: type + span */
  type?: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month'
  span?: number
  /** Legacy format: timespan + multiplier */
  multiplier?: number
  timespan?: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month'
  text: string
}

export interface ScriptExecuteParams {
  code: string
  language: string
  symbol: SymbolInfo
  period: Period
  settings?: Record<string, SettingValue>
}

export type SettingValue = string | number | boolean

export interface ScriptCompileResult {
  success: boolean
  errors?: ScriptDiagnostic[]
  warnings?: ScriptDiagnostic[]
  metadata?: IndicatorMetadata
}

export interface ScriptDiagnostic {
  line: number
  column: number
  endLine?: number
  endColumn?: number
  message: string
  severity: 'error' | 'warning' | 'info'
}

export interface IndicatorMetadata {
  shortName: string
  precision: number
  paneId: string
  plots: IndicatorPlot[]
  settings?: IndicatorSetting[]
  minValue?: number
  maxValue?: number
}

export interface IndicatorSetting {
  key: string
  type: 'number' | 'boolean' | 'string' | 'select'
  label: string
  defaultValue: SettingValue
  min?: number
  max?: number
  step?: number
  options?: Array<{ label: string; value: SettingValue }>
}

export type IndicatorPlot =
  | PlotLine
  | PlotHistogram
  | PlotHLine
  | PlotShape
  | PlotChar
  | PlotArrow
  | PlotCandle
  | PlotFill
  | PlotBgColor

export interface PlotLine {
  type: 'plot'
  id: string
  title: string
  color?: string
  linewidth?: number
  style?: 'line' | 'stepline' | 'histogram' | 'cross' | 'areabr' | 'area' | 'columns' | 'circles'
  gapConnect?: boolean
}

export interface PlotHistogram {
  type: 'histogram'
  id: string
  title: string
  color?: string
  histBase?: number
}

export interface PlotHLine {
  type: 'hline'
  id: string
  price: number
  title?: string
  color?: string
  linestyle?: 'solid' | 'dashed' | 'dotted'
  linewidth?: number
}

export interface PlotShape {
  type: 'plotshape'
  id: string
  series: string
  title?: string
  style?: string
  location?: string
  color?: string
  size?: string
  text?: string
  textcolor?: string
  linewidth?: number
}

export interface PlotChar {
  type: 'plotchar'
  id: string
  series: string
  char?: string
  title?: string
  location?: string
  color?: string
  size?: string
}

export interface PlotArrow {
  type: 'plotarrow'
  id: string
  series: string
  title?: string
  colorup?: string
  colordown?: string
}

export interface PlotCandle {
  type: 'plotcandle'
  id: string
  open: string
  high: string
  low: string
  close: string
  title?: string
  color?: string
  wickcolor?: string
  bordercolor?: string
}

export interface PlotFill {
  type: 'fill'
  id: string
  plot1: string
  plot2: string
  color?: string
  transp?: number
}

export interface PlotBgColor {
  type: 'bgcolor'
  color: string
  transp?: number
}

export interface IndicatorDataPoint {
  timestamp: number
  values: Record<string, number>
  colors?: Record<string, string>
  ohlc?: Record<string, { open: number; high: number; low: number; close: number }>
}

export interface Candle {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// WebSocket Message Types
export interface WSMessage {
  type: string
  requestId?: string
  [key: string]: unknown
}

export interface CompileRequest extends WSMessage {
  type: 'compile'
  code: string
  language: string
}

export interface ExecuteRequest extends WSMessage {
  type: 'execute'
  code: string
  language: string
  symbol: SymbolInfo
  period: Period
  settings?: Record<string, SettingValue>
}

export interface StopRequest extends WSMessage {
  type: 'stop'
  scriptId: string
}

export interface CompileResponse extends WSMessage {
  type: 'compileResult'
  result: ScriptCompileResult
}

export interface ExecuteResponse extends WSMessage {
  type: 'subscribeAck'
  scriptId: string
  metadata: IndicatorMetadata
}

export interface DataMessage extends WSMessage {
  type: 'indicatorData'
  scriptId: string
  data: IndicatorDataPoint[]
}

export interface TickMessage extends WSMessage {
  type: 'indicatorTick'
  scriptId: string
  data: IndicatorDataPoint
}

export interface ErrorMessage extends WSMessage {
  type: 'error'
  error: string
  scriptId?: string
}
