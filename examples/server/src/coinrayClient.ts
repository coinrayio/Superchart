/**
 * Coinray API Client
 * Fetches historical OHLCV data and subscribes to real-time updates.
 *
 * Subscription model: one Coinray WebSocket stream per ticker+resolution.
 * Multiple script executions that share the same ticker+resolution fan out from
 * a single underlying stream. Coinray is only unsubscribed when the last handler
 * for a given stream is removed.
 */

import Coinray from 'coinrayjs'
import type { Candle as CoinrayCandle, CandlePayload } from 'coinrayjs'
import type { Candle, Period, SymbolInfo } from './types.js'

// Singleton Coinray instance
let coinrayInstance: Coinray | null = null

function getCoinray(): Coinray {
  if (!coinrayInstance) {
    const token = process.env.COINRAY_TOKEN

    if (!token) {
      throw new Error('COINRAY_TOKEN environment variable is required')
    }

    coinrayInstance = new Coinray(token)

    // Set up token refresh handler
    coinrayInstance.onTokenExpired(async () => {
      console.log('[Coinray] Token expired, attempting to refresh...')

      const refreshedToken = process.env.COINRAY_TOKEN

      if (!refreshedToken) {
        throw new Error('COINRAY_TOKEN environment variable is required for refresh')
      }

      console.log('[Coinray] Token refreshed successfully')
      return refreshedToken
    })
  }

  return coinrayInstance
}

/**
 * One shared Coinray WebSocket subscription per ticker+resolution.
 * Holds an arbitrary number of per-execution tick handlers.
 */
interface SharedStream {
  /** Unsubscribe from Coinray (called only when handlers is empty) */
  unsubscribeCoinray: () => Promise<void>
  /** Per-execution tick handlers: handlerId → callback */
  handlers: Map<string, (candle: Candle) => void>
}

export class CoinrayClient {
  /** Map: subscriptionKey ("BTCUSDT_60") → shared stream */
  private streams = new Map<string, SharedStream>()
  /** Reverse map: handlerId → subscriptionKey (for O(1) lookup in removeTickHandler) */
  private handlerToKey = new Map<string, string>()
  private handlerCounter = 0

  /**
   * Convert superchart period to Coinray resolution format
   */
  private periodToResolution(period: Period): string {
    // Support both klinecharts format (type/span) and legacy format (timespan/multiplier)
    const timespan = period.timespan ?? period.type
    const multiplier = period.multiplier ?? period.span ?? 1

    switch (timespan) {
      case 'second':
        if (multiplier === 1) return '1S'
        throw new Error(`Unsupported second resolution: ${multiplier}s`)
      case 'minute':
        return String(multiplier)
      case 'hour':
        return String(multiplier * 60)
      case 'day':
        return multiplier === 1 ? 'D' : `${multiplier}D`
      case 'week':
        return multiplier === 1 ? 'W' : `${multiplier}W`
      case 'month':
        return multiplier === 1 ? 'M' : `${multiplier}M`
      default:
        throw new Error(`Unsupported timespan: ${timespan}`)
    }
  }

  /**
   * Convert Coinray candle to Candle format
   */
  private coinrayCandleToCandle(coinrayCandle: CoinrayCandle): Candle {
    return {
      timestamp: coinrayCandle.time.getTime(),
      open: coinrayCandle.open,
      high: coinrayCandle.high,
      low: coinrayCandle.low,
      close: coinrayCandle.close,
      volume: coinrayCandle.baseVolume,
    }
  }

  /**
   * Fetch historical OHLCV data
   * @param before - Optional Unix ms timestamp. When set, fetches `limit` candles ending before this time.
   */
  async fetchHistory(
    symbol: SymbolInfo,
    period: Period,
    limit: number = 500,
    before?: number
  ): Promise<Candle[]> {
    try {
      const coinray = getCoinray()
      const resolution = this.periodToResolution(period)
      const end = before ? Math.floor(before / 1000) : Math.floor(Date.now() / 1000)
      const start = end - (limit * this.resolutionToSeconds(resolution))

      const candles = await coinray.fetchCandles({
        coinraySymbol: symbol.ticker,
        resolution,
        start,
        end,
      })

      if (!Array.isArray(candles)) {
        throw new Error('Invalid response from Coinray API')
      }

      return candles.map(candle => this.coinrayCandleToCandle(candle))
    } catch (error) {
      console.error('Error fetching history:', error)
      throw error
    }
  }

  /**
   * Subscribe a tick handler to a ticker+resolution stream.
   *
   * If a Coinray subscription already exists for this stream, `onTick` is added
   * as an additional handler — no new Coinray connection is opened.
   *
   * @returns A unique `handlerId`. Pass it to `removeTickHandler()` to clean up.
   */
  async subscribeKlines(
    symbol: SymbolInfo,
    period: Period,
    onTick: (candle: Candle) => void
  ): Promise<string> {
    const coinray = getCoinray()
    const resolution = this.periodToResolution(period)
    const subscriptionKey = `${symbol.ticker}_${resolution}`
    const handlerId = `${subscriptionKey}_${++this.handlerCounter}`

    let stream = this.streams.get(subscriptionKey)

    if (!stream) {
      // First handler for this stream — open a Coinray subscription
      console.log(`[Coinray] Subscribing to ${symbol.ticker}@${resolution}`)

      const unsubscribeCoinray = await coinray.subscribeCandles(
        { coinraySymbol: symbol.ticker, resolution },
        (payload: CandlePayload) => {
          if (!payload || !payload.candle) return
          const candle = this.coinrayCandleToCandle(payload.candle)
          // Fan out to all registered handlers
          for (const handler of this.streams.get(subscriptionKey)?.handlers.values() ?? []) {
            handler(candle)
          }
        }
      )

      stream = { unsubscribeCoinray, handlers: new Map() }
      this.streams.set(subscriptionKey, stream)
      console.log(`[Coinray] Subscribed to ${symbol.ticker}@${resolution}`)
    } else {
      console.log(`[Coinray] Reusing existing stream ${symbol.ticker}@${resolution} (handlers: ${stream.handlers.size + 1})`)
    }

    stream.handlers.set(handlerId, onTick)
    this.handlerToKey.set(handlerId, subscriptionKey)

    return handlerId
  }

  /**
   * Remove a single tick handler.
   * The Coinray subscription is kept alive as long as at least one other handler
   * references the same stream. It is only closed when this is the last handler.
   */
  async removeTickHandler(handlerId: string): Promise<void> {
    const subscriptionKey = this.handlerToKey.get(handlerId)
    if (!subscriptionKey) return

    const stream = this.streams.get(subscriptionKey)
    if (!stream) return

    stream.handlers.delete(handlerId)
    this.handlerToKey.delete(handlerId)

    if (stream.handlers.size === 0) {
      // Last handler removed — close the Coinray connection for this stream
      await stream.unsubscribeCoinray()
      this.streams.delete(subscriptionKey)
      console.log(`[Coinray] Unsubscribed from ${subscriptionKey} (no more handlers)`)
    } else {
      console.log(`[Coinray] Removed handler from ${subscriptionKey} (${stream.handlers.size} remaining)`)
    }
  }

  /**
   * Cleanup all subscriptions
   */
  async dispose(): Promise<void> {
    for (const [key, stream] of this.streams) {
      try {
        await stream.unsubscribeCoinray()
      } catch (error) {
        console.error(`Error unsubscribing from ${key}:`, error)
      }
    }
    this.streams.clear()
    this.handlerToKey.clear()
  }

  /**
   * Convert resolution string to seconds
   */
  private resolutionToSeconds(resolution: string): number {
    if (resolution === 'D') return 86400
    if (resolution === 'W') return 604800
    if (resolution === 'M') return 2592000 // 30 days
    if (resolution === '1S') return 1

    // Handle numeric resolutions (minutes)
    const minutes = parseInt(resolution)
    return minutes * 60
  }
}
