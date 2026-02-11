/**
 * Coinray API Client
 * Fetches historical OHLCV data and subscribes to real-time updates
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

export class CoinrayClient {
  private subscriptions = new Map<string, () => Promise<void>>()

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
   */
  async fetchHistory(
    symbol: SymbolInfo,
    period: Period,
    limit: number = 500
  ): Promise<Candle[]> {
    try {
      const coinray = getCoinray()
      const resolution = this.periodToResolution(period)
      const end = Math.floor(Date.now() / 1000)
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
   * Subscribe to real-time candle updates
   */
  async subscribeKlines(
    symbol: SymbolInfo,
    period: Period,
    onTick: (candle: Candle) => void
  ): Promise<string> {
    const coinray = getCoinray()
    const resolution = this.periodToResolution(period)
    const subscriptionKey = `${symbol.ticker}_${resolution}`

    // Unsubscribe if already subscribed
    if (this.subscriptions.has(subscriptionKey)) {
      await this.unsubscribe(subscriptionKey)
    }

    console.log(`[Coinray] Subscribing to ${symbol.ticker}@${resolution}`)

    // Subscribe to candles - returns unsubscribe function
    const unsubscribe = await coinray.subscribeCandles(
      {
        coinraySymbol: symbol.ticker,
        resolution,
      },
      (payload: CandlePayload) => {
        if (!payload || !payload.candle) return
        onTick(this.coinrayCandleToCandle(payload.candle))
      }
    )

    this.subscriptions.set(subscriptionKey, unsubscribe)
    console.log(`[Coinray] Subscribed to ${symbol.ticker}@${resolution}`)

    return subscriptionKey
  }

  /**
   * Unsubscribe from candle updates
   */
  async unsubscribe(subscriptionKey: string): Promise<void> {
    const unsubscribe = this.subscriptions.get(subscriptionKey)
    if (unsubscribe) {
      await unsubscribe()
      this.subscriptions.delete(subscriptionKey)
      console.log(`[Coinray] Unsubscribed from ${subscriptionKey}`)
    }
  }

  /**
   * Cleanup all subscriptions
   */
  async dispose(): Promise<void> {
    for (const [key, unsubscribe] of this.subscriptions) {
      try {
        await unsubscribe()
      } catch (error) {
        console.error(`Error unsubscribing from ${key}:`, error)
      }
    }
    this.subscriptions.clear()
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
