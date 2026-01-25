/**
 * Chart types - extends base klinecharts types
 *
 * We import core types from coinray-chart and only add/extend what's needed.
 */

// Re-export base types from coinray-chart for convenience
export type {
  KLineData,
  Nullable,
  DeepPartial,
  Period as BasePeriod,
  SymbolInfo as BaseSymbolInfo,
  Coordinate,
  Point,
  BarSpace,
  Bounding,
  VisibleRange,
  Chart,
  Styles,
  Options,
  DataLoader,
  PaneOptions,
  ActionType,
  ActionCallback,
} from 'klinecharts'

export {
  init,
  dispose,
  registerIndicator,
  registerOverlay,
  registerFigure,
  getSupportedIndicators,
  getSupportedOverlays,
  utils,
} from 'klinecharts'

import type { Period as BasePeriod, SymbolInfo as BaseSymbolInfo, Chart, Nullable, Overlay } from 'klinecharts'

/**
 * Extended Period with display text (following coinray-chart-ui pattern)
 */
export interface Period extends BasePeriod {
  /** Display text (e.g., "1m", "1H", "1D") */
  text: string
}

/**
 * Extended SymbolInfo with additional metadata
 */
export interface SymbolInfo extends BaseSymbolInfo {
  /** Display name (e.g., "Bitcoin / USDT") */
  name?: string
  /** Short name */
  shortName?: string
  /** Exchange name (e.g., "BINANCE") */
  exchange?: string
  /** Market type */
  market?: string
  /** Price currency */
  priceCurrency?: string
  /** Logo URL */
  logo?: string
}

/**
 * Extended Chart interface with additional methods
 */
export interface ProChart extends Chart {
  /** Get the underlying chart instance */
  chart: Chart

  /** Get overlay by ID */
  getOverlayById(id: string): Nullable<Overlay>
}

/**
 * Crosshair position info
 */
export interface CrosshairInfo {
  x: number
  y: number
  paneId: string
  dataIndex: number
  kLineData: import('klinecharts').KLineData | null
}

/**
 * Pane layout for persistence
 */
export interface PaneLayout {
  id: string
  height: number
  minHeight?: number
  state: 'normal' | 'maximize' | 'minimize'
  order: number
}

/**
 * Predefined periods for convenience
 */
export const PERIODS: Record<string, Period> = {
  '1s': { type: 'second', span: 1, text: '1s' },
  '1m': { type: 'minute', span: 1, text: '1m' },
  '3m': { type: 'minute', span: 3, text: '3m' },
  '5m': { type: 'minute', span: 5, text: '5m' },
  '15m': { type: 'minute', span: 15, text: '15m' },
  '30m': { type: 'minute', span: 30, text: '30m' },
  '1h': { type: 'hour', span: 1, text: '1H' },
  '2h': { type: 'hour', span: 2, text: '2H' },
  '4h': { type: 'hour', span: 4, text: '4H' },
  '6h': { type: 'hour', span: 6, text: '6H' },
  '12h': { type: 'hour', span: 12, text: '12H' },
  '1D': { type: 'day', span: 1, text: '1D' },
  '3D': { type: 'day', span: 3, text: '3D' },
  '1W': { type: 'week', span: 1, text: '1W' },
  '1M': { type: 'month', span: 1, text: '1M' },
}

/**
 * Format period to display string
 */
export function formatPeriod(period: BasePeriod): string {
  const unitMap: Record<string, string> = {
    second: 's',
    minute: 'm',
    hour: 'H',
    day: 'D',
    week: 'W',
    month: 'M',
    year: 'Y',
  }
  return `${period.span}${unitMap[period.type] ?? period.type}`
}
