/**
 * Coinray Datafeed - TradingView-compatible datafeed using Coinray API
 */

// @ts-expect-error — CoinrayCache is exported from coinrayjs but has no type declarations
import Coinray, { CoinrayCache } from 'coinrayjs'
import type { Candle as CoinrayCandle, CandlePayload } from 'coinrayjs'
import type {
  Datafeed,
  DatafeedConfiguration,
  LibrarySymbolInfo,
  Bar,
  PeriodParams,
  HistoryMetadata,
  SearchSymbolResult,
} from '@superchart/types/datafeed'

// Singleton Coinray instance
let coinrayInstance: Coinray | null = null

function getCoinray(token: string): Coinray {
  if (!coinrayInstance) {
    coinrayInstance = new Coinray(token)

    // Set up token refresh handler
    coinrayInstance.onTokenExpired(async () => {
      console.log('[Coinray] Token expired, attempting to refresh...')
      // In production, fetch a new token from your auth service
      return token
    })
  }

  return coinrayInstance
}

// Singleton CoinrayCache instance (has getMarkets after initialize())
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cacheInstance: any = null
let cacheReady: Promise<void> | null = null

function getCoinrayCacheReady(token: string): Promise<any> {
  if (!cacheInstance) {
    cacheInstance = new CoinrayCache(token, {}, 30 * 1000)
    cacheInstance.onTokenExpired(async () => token)
    cacheReady = cacheInstance.initialize()
  }
  return (cacheReady ?? Promise.resolve()).then(() => cacheInstance)
}

export class CoinrayDatafeed implements Datafeed {
  private token: string
  private subscriptions = new Map<string, () => Promise<void>>()

  constructor(token: string) {
    this.token = token
  }

  onReady(callback: (config: DatafeedConfiguration) => void): void {
    setTimeout(() => {
      callback({
        supportedResolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W', '1M'],
        supports_marks: false,
        supports_timescale_marks: false,
        symbolsTypes: [
          { name: 'Crypto', value: 'crypto' },
        ],
        exchanges: [
          { value: 'BINA', name: 'Binance' },
          { value: 'BIFU', name: 'Binance Futures' },
          { value: 'BIUS', name: 'Binance US' },
          { value: 'BNGX', name: 'BingX' },
          { value: 'BNGXF', name: 'BingX Futures' },
          { value: 'BITMF', name: 'BitMart' },
          { value: 'BMEX', name: 'Bitmex' },
          { value: 'BVVO', name: 'Bitvavo' },
          { value: 'BYBI', name: 'ByBit' },
          { value: 'BYBIF', name: 'ByBit Futures' },
          { value: 'GDAX', name: 'Coinbase' },
          { value: 'CRO', name: 'Crypto.com' },
          { value: 'GATE', name: 'Gate.io' },
          { value: 'HUBI', name: 'HTX' },
          { value: 'HITB', name: 'HitBTC' },
          { value: 'HYPERLIQUID', name: 'Hyperliquid' },
          { value: 'HYPERLIQUIDF', name: 'Hyperliquid Futures' },
          { value: 'KRKN', name: 'Kraken' },
          { value: 'KUCN', name: 'Kucoin' },
          { value: 'KUCNF', name: 'Kucoin Futures' },
          { value: 'MEXC', name: 'Mexc' },
          { value: 'OKEX', name: 'OKX' },
          { value: 'PLNX', name: 'Poloniex' },
          { value: 'TBITF', name: 'Toobit' },
          { value: 'WOO', name: 'WOO' },
        ],
      })
    }, 0)
  }

  searchSymbols(
    userInput: string,
    exchange: string,
    _symbolType: string,
    onResult: (results: SearchSymbolResult[]) => void
  ): void {
    const query = (userInput ?? '').toLowerCase()
    const exchangeFilter = exchange?.toUpperCase() || ''

    getCoinrayCacheReady(this.token)
      .then((cache: Record<string, unknown>) => {
        // Markets are stored per-exchange: cache.exchanges.BINA.markets, etc.
        // Market fields from Coinray API: coinraySymbol, symbol, baseCurrency, quoteCurrency, exchangeCode
        const allExchanges = cache.exchanges as Record<string, { code?: string; name?: string; logo?: string; markets?: Record<string, Record<string, unknown>> }> | undefined
        const allMarkets: Array<{ coinraySymbol: string; displaySymbol: string; base: string; quote: string; exchangeCode: string; exchangeName: string; exchangeLogo: string }> = []
        for (const [code, ex] of Object.entries(allExchanges ?? {})) {
          if (exchangeFilter && code !== exchangeFilter) continue
          for (const m of Object.values(ex.markets ?? {})) {
            allMarkets.push({
              coinraySymbol: (m.coinraySymbol ?? '') as string,
              displaySymbol: (m.symbol ?? m.symbolAlt ?? '') as string,
              base: (m.baseCurrency ?? '') as string,
              quote: (m.quoteCurrency ?? '') as string,
              exchangeCode: (m.exchangeCode ?? code) as string,
              exchangeName: ex.name ?? code,
              exchangeLogo: (ex.logo ?? '') as string,
            })
          }
        }
        const results: SearchSymbolResult[] = allMarkets
          .filter(m => {
            if (!query) return true
            const sym = m.displaySymbol.toLowerCase()
            const base = m.base.toLowerCase()
            const quote = m.quote.toLowerCase()
            return sym.includes(query) || base.includes(query) || quote.includes(query)
          })
          .slice(0, 50)
          .map(m => ({
            symbol: m.coinraySymbol,
            full_name: `${m.base}/${m.quote}`,
            description: `${m.base} / ${m.quote}`,
            exchange: m.exchangeName,
            exchange_logo: m.exchangeLogo || undefined,
            type: 'crypto',
          }))
        onResult(results)
      })
      .catch(() => onResult([]))
  }

  resolveSymbol(
    symbolName: string,
    onResolve: (symbolInfo: LibrarySymbolInfo) => void,
    onError: (reason: string) => void
  ): void {
    // Parse Coinray symbol format: EXCHANGE_QUOTE_BASE (e.g., BINA_USDT_BTC)
    const parts = symbolName.split('_')
    if (parts.length !== 3) {
      onError(`Invalid symbol format: ${symbolName}`)
      return
    }

    const [exchange, quote, base] = parts

    setTimeout(() => {
      onResolve({
        ticker: symbolName,
        name: `${base}/${quote}`,
        type: 'crypto',
        exchange: exchange,
        timezone: 'Etc/UTC',
        pricescale: 100, // 2 decimal places by default
        minmov: 1,
        has_intraday: true,
        has_daily: true,
        supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W', '1M'],
        session: '24x7',
      })
    }, 0)
  }

  getBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: string,
    periodParams: PeriodParams,
    onResult: (bars: Bar[], meta?: HistoryMetadata) => void,
    onError: (reason: string) => void
  ): void {
    const coinray = getCoinray(this.token)
    const { from, countBack, to } = periodParams
    const end = to // Already in seconds
    const start = countBack > 0
      ? end - (countBack * this.resolutionToSeconds(resolution))
      : from // Use explicit from when countBack is 0 (range-based fetch)

    coinray.fetchCandles({
      coinraySymbol: symbolInfo.ticker,
      resolution,
      start,
      end,
    })
      .then((candles: CoinrayCandle[]) => {
        const bars: Bar[] = candles.map((candle: CoinrayCandle) => ({
          time: candle.time.getTime(),
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.baseVolume,
        }))

        // Sort by time ascending
        bars.sort((a, b) => a.time - b.time)

        onResult(bars, {
          noData: bars.length === 0,
        })
      })
      .catch((error: any) => {
        console.error('Error fetching bars:', error)
        onError(error.message || 'Failed to fetch bars')
      })
  }

  subscribeBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: string,
    onTick: (bar: Bar) => void,
    listenerGuid: string
  ): void {
    const coinray = getCoinray(this.token)

    coinray.subscribeCandles(
      {
        coinraySymbol: symbolInfo.ticker,
        resolution,
      },
      (payload: CandlePayload) => {
        if (!payload || !payload.candle) return

        const candle = payload.candle
        onTick({
          time: candle.time.getTime(),
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.baseVolume,
        })
      }
    ).then((unsubscribe: () => Promise<void>) => {
      this.subscriptions.set(listenerGuid, unsubscribe)
    }).catch((error: any) => {
      console.error('Error subscribing to candles:', error)
    })
  }

  getFirstCandleTime(
    symbolName: string,
    resolution: string,
    callback: (timestamp: number | null) => void
  ): void {
    const coinray = getCoinray(this.token)
    coinray.fetchFirstCandleTime({
      coinraySymbol: symbolName,
      resolution,
    })
      .then((startTime: Date | string) => {
        callback(new Date(startTime).getTime())
      })
      .catch((error: unknown) => {
        console.error('Error fetching first candle time:', error)
        callback(null)
      })
  }

  async unsubscribeBars(listenerGuid: string): Promise<void> {
    const unsubscribe = this.subscriptions.get(listenerGuid)
    if (unsubscribe) {
      try {
        await unsubscribe()
      } catch (error) {
        console.error('Error unsubscribing:', error)
      }
      this.subscriptions.delete(listenerGuid)
    }
  }

  /**
   * Convert resolution string to seconds
   */
  private resolutionToSeconds(resolution: string): number {
    if (resolution === '1D') return 86400
    if (resolution === '1W') return 604800
    if (resolution === '1M') return 2592000 // 30 days

    // Handle numeric resolutions (minutes)
    const minutes = parseInt(resolution)
    return minutes * 60
  }

  /**
   * Cleanup all subscriptions
   */
  dispose(): void {
    for (const listenerGuid of this.subscriptions.keys()) {
      this.unsubscribeBars(listenerGuid)
    }
    this.subscriptions.clear()
  }
}
