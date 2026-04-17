/**
 * DataLoader Bridge - Creates a klinecharts DataLoader from a TradingView-style Datafeed
 *
 * Usage:
 *   const loader = createDataLoader(myTVDatafeed)
 *   const chart = new Superchart({ dataLoader: loader, ... })
 */

import type { DataLoader, KLineData, Period as BasePeriod } from 'klinecharts'
import type {
  Datafeed,
  LibrarySymbolInfo,
  Bar,
  SearchSymbolResult,
} from '../types/datafeed'
import { periodToResolution } from '../types/datafeed'
import * as store from '../store/chartStore'

/** Default number of bars to request per page */
const DEFAULT_COUNT_BACK = 500

/**
 * Adjust from/to timestamps based on period
 * Returns [from, to] in milliseconds, properly aligned to period boundaries
 */
function adjustFromTo(period: BasePeriod, toTimestamp: number, count: number): [number, number] {
  let to = toTimestamp
  let from = to

  switch (period.type) {
    case 'second':
      to -= to % (1000)
      from = to - count * period.span * 1000
      break

    case 'minute':
      to -= to % (60 * 1000)
      from = to - count * period.span * 60 * 1000
      break

    case 'hour':
      to -= to % (60 * 60 * 1000)
      from = to - count * period.span * 60 * 60 * 1000
      break

    case 'day':
      to -= to % (24 * 60 * 60 * 1000)
      from = to - count * period.span * 24 * 60 * 60 * 1000
      break

    case 'week': {
      const date = new Date(to)
      const day = date.getDay() || 7 // Sunday -> 7
      date.setHours(0, 0, 0, 0)
      to = date.getTime() - (day - 1) * 24 * 60 * 60 * 1000
      from = to - count * period.span * 7 * 24 * 60 * 60 * 1000
      break
    }

    case 'month': {
      const date = new Date(to)
      to = new Date(date.getFullYear(), date.getMonth(), 1).getTime()
      const _from = new Date(to - count * period.span * 30 * 24 * 60 * 60 * 1000)
      from = new Date(_from.getFullYear(), _from.getMonth(), 1).getTime()
      break
    }

    case 'year': {
      const date = new Date(to)
      to = new Date(date.getFullYear(), 0, 1).getTime()
      const _from = new Date(to - count * period.span * 365 * 24 * 60 * 60 * 1000)
      from = new Date(_from.getFullYear(), 0, 1).getTime()
      break
    }
  }

  return [from, to]
}

/**
 * Extended DataLoader that also exposes searchSymbols from the Datafeed
 */
export interface SuperchartDataLoader extends DataLoader {
  /** Search for symbols (delegates to Datafeed.searchSymbols) */
  searchSymbols(
    userInput: string,
    exchange: string,
    symbolType: string,
    onResult: (results: SearchSymbolResult[]) => void
  ): void

  /**
   * Register a callback that fires whenever a range of bars is successfully loaded.
   * fromMs is the start of the loaded range in milliseconds.
   * Use this to request matching historical indicator data from the script provider.
   */
  setOnBarsLoaded(callback: (fromMs: number) => void): void
}

/**
 * Convert a TradingView Bar to a klinecharts KLineData
 */
function barToKLineData(bar: Bar): KLineData {
  return {
    timestamp: bar.time,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume,
  }
}

/**
 * Create a klinecharts DataLoader from a TradingView-compatible Datafeed.
 *
 * @param datafeed - A TradingView-compatible Datafeed implementation
 * @returns A klinecharts DataLoader with an additional searchSymbols method
 *
 * @example
 * ```typescript
 * const dataLoader = createDataLoader(myDatafeed)
 * const chart = new Superchart({
 *   container: '#chart',
 *   dataLoader,
 *   symbol: { ticker: 'BTCUSDT', pricePrecision: 2, volumePrecision: 0 },
 *   period: { span: 1, type: 'hour', text: '1H' },
 * })
 * ```
 */
export function createDataLoader(datafeed: Datafeed): SuperchartDataLoader {
  // Cache resolved symbols to avoid redundant calls
  const symbolCache = new Map<string, LibrarySymbolInfo>()

  // Track active subscriptions for cleanup
  const activeSubscriptions = new Map<string, string>() // subscriberUID -> ticker

  // Callback invoked after each successful bar load (used to trigger indicator history loading).
  // Wrapped in an object so TypeScript doesn't narrow it away inside async closures.
  const barsLoadedRef: { callback: ((fromMs: number) => void) | null } = { callback: null }

  // Initialize datafeed configuration
  datafeed.onReady(() => {
    // Configuration loaded
  })

  /**
   * Resolve a symbol, using cache when available
   */
  function resolveSymbol(ticker: string): Promise<LibrarySymbolInfo> {
    const cached = symbolCache.get(ticker)
    if (cached) return Promise.resolve(cached)

    return new Promise((resolve, reject) => {
      datafeed.resolveSymbol(
        ticker,
        (info) => {
          symbolCache.set(ticker, info)
          resolve(info)
        },
        (error) => reject(new Error(error))
      )
    })
  }

  /**
   * Generate a deterministic subscriber UID
   */
  function getSubscriberUID(ticker: string, resolution: string): string {
    return `${ticker}_${resolution}`
  }

  const loader: SuperchartDataLoader = {
    getBars: async (params) => {
      const { type, timestamp, symbol, period, callback } = params
      const resolution = periodToResolution(period)

      // Forward loading not supported - historical charts only load backwards
      if (type === 'backward') {
        callback([], { backward: false })
        return
      }

      // Update type is handled by subscribeBar
      if (type === 'update') {
        return
      }

      // init or backward — fetch historical data
      store.setLoadingVisible(true)

      try {
        const symbolInfo = await resolveSymbol(symbol.ticker)

        const firstDataRequest = type === 'init'
        const now = Date.now()
        const timestampMs = timestamp ?? now

        // Calculate aligned time range
        // For backward/init: load data from (timestamp - count*period) to timestamp
        const [fromMs, toMs] = adjustFromTo(period, timestampMs, DEFAULT_COUNT_BACK)

        // Convert to seconds for TradingView API
        const to = Math.floor(toMs / 1000)
        const from = Math.floor(fromMs / 1000)

        datafeed.getBars(
          symbolInfo,
          resolution,
          {
            from,
            to,
            countBack: DEFAULT_COUNT_BACK,
            firstDataRequest,
          },
          (bars, meta) => {
            const klineData = bars.map(barToKLineData)
            const hasMore = !(meta?.noData ?? false)
            // Set both backward and forward flags explicitly
            // Backward: always allow loading older data if available
            // Forward: never allow loading future data (historical charts only)
            callback(klineData, { backward: false, forward: hasMore })

            // Notify indicator providers so they can fetch matching historical data
            if (bars.length > 0 && barsLoadedRef.callback) {
              barsLoadedRef.callback(fromMs)
            }

            store.setLoadingVisible(false)
          },
          (error) => {
            console.error('DataLoader getBars error:', error)
            callback([], { backward: false })
            store.setLoadingVisible(false)
          }
        )
      } catch (error) {
        console.error('DataLoader resolveSymbol error:', error)
        callback([], { backward: false })
        store.setLoadingVisible(false)
      }
    },

    subscribeBar: (params) => {
      const { symbol, period, callback } = params
      const resolution = periodToResolution(period)
      const subscriberUID = getSubscriberUID(symbol.ticker, resolution)

      resolveSymbol(symbol.ticker).then((symbolInfo) => {
        datafeed.subscribeBars(
          symbolInfo,
          resolution,
          (bar) => {
            callback(barToKLineData(bar))
          },
          subscriberUID
        )
        activeSubscriptions.set(subscriberUID, symbol.ticker)
      }).catch((error) => {
        console.error('DataLoader subscribeBar error:', error)
      })
    },

    unsubscribeBar: (params) => {
      const { symbol, period } = params
      const resolution = periodToResolution(period)
      const subscriberUID = getSubscriberUID(symbol.ticker, resolution)

      datafeed.unsubscribeBars(subscriberUID)
      activeSubscriptions.delete(subscriberUID)
    },

    getRange: (params) => {
      const { symbol, period, from, to, callback } = params
      const resolution = periodToResolution(period)

      resolveSymbol(symbol.ticker).then((symbolInfo) => {
        datafeed.getBars(
          symbolInfo,
          resolution,
          {
            from: Math.floor(from / 1000),
            to: Math.floor(to / 1000),
            countBack: 0,
            firstDataRequest: false,
          },
          (bars) => {
            const klineData = bars.map(barToKLineData)
            klineData.sort((a, b) => a.timestamp - b.timestamp)
            callback(klineData)
          },
          (error) => {
            console.error('DataLoader getRange error:', error)
            callback([])
          }
        )
      }).catch((error) => {
        console.error('DataLoader getRange resolveSymbol error:', error)
        callback([])
      })
    },

    getFirstCandleTime: datafeed.getFirstCandleTime != null
      ? (params) => {
          const { symbol, period, callback } = params
          const resolution = periodToResolution(period)
          datafeed.getFirstCandleTime!(symbol.ticker, resolution, callback)
        }
      : undefined,

    searchSymbols: (userInput, exchange, symbolType, onResult) => {
      datafeed.searchSymbols(userInput, exchange, symbolType, onResult)
    },

    setOnBarsLoaded(cb: (fromMs: number) => void) {
      barsLoadedRef.callback = cb
    },
  }

  return loader
}

export default createDataLoader
