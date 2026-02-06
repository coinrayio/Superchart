// Type definitions for coinrayjs
declare module 'coinrayjs' {
  export interface Candle {
    time: Date
    open: number
    high: number
    low: number
    close: number
    baseVolume: number
    quoteVolume: number
    numTrades: number
    skipVolume?: boolean
  }

  export interface CandlePayload {
    coinraySymbol: string
    resolution: string
    candle: Candle
    previousCandles?: Candle[]
  }

  export interface SubscribeCandlesOptions {
    coinraySymbol: string
    resolution: string
    lastCandle?: Candle
  }

  export interface FetchCandlesOptions {
    coinraySymbol: string
    resolution: string
    start: number
    end: number
    useWebSocket?: boolean
  }

  export default class Coinray {
    constructor(token: string)
    destroy(): void
    onTokenExpired(handler: () => Promise<string>): void
    subscribeCandles(
      options: SubscribeCandlesOptions,
      callback: (payload: CandlePayload) => void
    ): Promise<() => Promise<void>>
    fetchCandles(options: FetchCandlesOptions): Promise<Candle[]>
    unsubscribeCandles(options: SubscribeCandlesOptions): Promise<void>
  }
}
