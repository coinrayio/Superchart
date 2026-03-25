/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COINRAY_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module 'coinrayjs' {
  class Coinray {
    constructor(token: string)
    onTokenRefresh(callback: (token: string) => void): void
    fetchCandles(params: Record<string, unknown>): Promise<Candle[]>
    subscribeCandles(params: Record<string, unknown>, callback: (payload: CandlePayload) => void): Promise<() => Promise<void>>
    [key: string]: any
  }
  export default Coinray
  export const types: any
  export interface Candle {
    time: Date
    open: number
    high: number
    low: number
    close: number
    baseVolume: number
    quoteVolume: number
    [key: string]: any
  }
  export interface CandlePayload {
    candle: Candle
  }
}
