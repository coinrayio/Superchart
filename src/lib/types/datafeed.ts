/**
 * Datafeed Types - TradingView-compatible data feed interface
 *
 * These types mirror TradingView's Charting Library Datafeed API,
 * enabling consumers to reuse existing TradingView datafeed implementations.
 */

import type { Period, BasePeriod } from './chart'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface DatafeedConfiguration {
  /** Supported time resolutions (e.g., ['1', '5', '15', '60', '240', '1D', '1W']) */
  supportedResolutions: string[]
  /** Available exchanges */
  exchanges?: { value: string; name: string }[]
  /** Available symbol types */
  symbolsTypes?: { name: string; value: string }[]
  /** Whether the datafeed supports marks on bars */
  supports_marks?: boolean
  /** Whether the datafeed supports timescale marks */
  supports_timescale_marks?: boolean
}

// ---------------------------------------------------------------------------
// Symbol Info
// ---------------------------------------------------------------------------

export interface LibrarySymbolInfo {
  /** Unique symbol identifier */
  ticker: string
  /** Display name */
  name: string
  /** Symbol type: 'crypto', 'stock', 'forex', 'futures', etc. */
  type?: string
  /** Exchange name */
  exchange?: string
  /** IANA timezone */
  timezone?: string
  /** Price scale: 100 = 2 decimals, 1000 = 3 decimals, 100000000 = 8 decimals */
  pricescale: number
  /** Minimum price movement (default: 1) */
  minmov?: number
  /** Whether intraday (minute/hour) resolutions are supported */
  has_intraday?: boolean
  /** Whether daily resolutions are supported */
  has_daily?: boolean
  /** Supported resolutions for this symbol */
  supported_resolutions?: string[]
  /** Trading session hours (e.g., '24x7', '0930-1600') */
  session?: string
  /** Logo URL */
  logo?: string
  /** Base currency */
  currency_code?: string
}

// ---------------------------------------------------------------------------
// Bar data
// ---------------------------------------------------------------------------

export interface Bar {
  /** Unix timestamp in milliseconds */
  time: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

// ---------------------------------------------------------------------------
// History request params
// ---------------------------------------------------------------------------

export interface PeriodParams {
  /** Start timestamp (Unix seconds) */
  from: number
  /** End timestamp (Unix seconds) */
  to: number
  /** Number of bars requested */
  countBack: number
  /** True on initial data load, false on scroll backward */
  firstDataRequest: boolean
}

export interface HistoryMetadata {
  /** True if no data is available for the requested range */
  noData?: boolean
  /** Timestamp (Unix seconds) of the next available data point */
  nextTime?: number
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export interface SearchSymbolResult {
  /** Symbol ticker (internal ID used by the datafeed) */
  symbol: string
  /** Full display name (e.g. "BTC/USDT") */
  full_name: string
  /** Human-readable description (e.g. "Bitcoin / Tether") */
  description?: string
  /** Exchange name */
  exchange?: string
  /** Symbol type (e.g. "crypto", "forex", "stock") */
  type?: string
  /** Symbol logo URL */
  logo?: string
  /** Exchange logo URL */
  exchange_logo?: string
}

// ---------------------------------------------------------------------------
// Datafeed Interface (mirrors TradingView's IDatafeedChartApi)
// ---------------------------------------------------------------------------

export interface Datafeed {
  /**
   * Called once when the chart initializes.
   * Must invoke callback with the datafeed configuration.
   */
  onReady(callback: (config: DatafeedConfiguration) => void): void

  /**
   * Search for symbols matching user input.
   */
  searchSymbols(
    userInput: string,
    exchange: string,
    symbolType: string,
    onResult: (results: SearchSymbolResult[]) => void
  ): void

  /**
   * Resolve a symbol name to full symbol info.
   */
  resolveSymbol(
    symbolName: string,
    onResolve: (symbolInfo: LibrarySymbolInfo) => void,
    onError: (reason: string) => void
  ): void

  /**
   * Get historical OHLCV bars.
   */
  getBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: string,
    periodParams: PeriodParams,
    onResult: (bars: Bar[], meta?: HistoryMetadata) => void,
    onError: (reason: string) => void
  ): void

  /**
   * Subscribe to real-time bar updates.
   */
  subscribeBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: string,
    onTick: (bar: Bar) => void,
    subscriberUID: string,
    onResetCacheNeeded?: () => void
  ): void

  /**
   * Unsubscribe from real-time bar updates.
   */
  unsubscribeBars(subscriberUID: string): void

  /**
   * Get the timestamp of the oldest available candle for a symbol at a given resolution.
   * Optional — used by the playback engine to validate start times.
   */
  getFirstCandleTime?(
    symbolName: string,
    resolution: string,
    callback: (timestamp: number | null) => void
  ): void
}

// ---------------------------------------------------------------------------
// Resolution <-> Period mapping utilities
// ---------------------------------------------------------------------------

/**
 * Convert a TradingView resolution string to a klinecharts Period.
 *
 * Format: '1'=1min, '5'=5min, '60'=1hr, '240'=4hr, '1D'=1day, '1W'=1week, '1M'=1month
 */
export function resolutionToPeriod(resolution: string): Period {
  const upper = resolution.toUpperCase()

  // Day
  if (upper === 'D' || upper === '1D') {
    return { span: 1, type: 'day', text: '1D' }
  }
  // Week
  if (upper === 'W' || upper === '1W') {
    return { span: 1, type: 'week', text: '1W' }
  }
  // Month
  if (upper === 'M' || upper === '1M') {
    return { span: 1, type: 'month', text: '1M' }
  }
  // Multi-day (e.g., '3D')
  if (upper.endsWith('D')) {
    const span = parseInt(upper, 10)
    return { span, type: 'day', text: `${span}D` }
  }
  // Multi-week
  if (upper.endsWith('W')) {
    const span = parseInt(upper, 10)
    return { span, type: 'week', text: `${span}W` }
  }
  // Multi-month
  if (upper.endsWith('M')) {
    const span = parseInt(upper, 10)
    return { span, type: 'month', text: `${span}M` }
  }

  // Numeric = minutes
  const minutes = parseInt(resolution, 10)
  if (isNaN(minutes) || minutes <= 0) {
    return { span: 1, type: 'minute', text: '1' }
  }

  // Convert to hours if >= 60
  if (minutes >= 60) {
    const hours = minutes / 60
    if (Number.isInteger(hours)) {
      return { span: hours, type: 'hour', text: `${hours}H` }
    }
  }

  return { span: minutes, type: 'minute', text: `${minutes}` }
}

/**
 * Convert a klinecharts Period to a TradingView resolution string.
 */
export function periodToResolution(period: BasePeriod): string {
  switch (period.type) {
    case 'second':
      return `${period.span}S`
    case 'minute':
      return String(period.span)
    case 'hour':
      return String(period.span * 60)
    case 'day':
      return period.span === 1 ? '1D' : `${period.span}D`
    case 'week':
      return period.span === 1 ? '1W' : `${period.span}W`
    case 'month':
      return period.span === 1 ? '1M' : `${period.span}M`
    case 'year':
      return `${period.span * 12}M`
    default:
      return String(period.span)
  }
}
