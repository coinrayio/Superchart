import type {Chart, Nullable, TradeLine, TradeLineProperties} from "klinecharts"
import {createTradeLine} from "klinecharts"

export interface Trade {
  time: number
  price: number
  side: "buy" | "sell"
  amount?: number
}

export interface TradeOptions {
  arrowType?: "wide" | "arrow" | "tiny"
  color?: string
  textColor?: string
  text?: string
  textFontSize?: number
  textGap?: number
  gap?: number
  showLabelArrow?: boolean
}

export function createTrade(
  chart: Chart,
  trade: Trade,
  options?: TradeOptions,
): Nullable<TradeLine> {
  const direction = trade.side === "buy" ? "up" : "down" as const
  const props: Partial<TradeLineProperties> = {
    direction,
    arrowType: options?.arrowType ?? "wide",
    color: options?.color,
    textColor: options?.textColor,
    text: options?.text ?? "",
    textFontSize: options?.textFontSize,
    textGap: options?.textGap,
    gap: options?.gap ?? 4,
    showLabelArrow: options?.showLabelArrow,
    timestamp: trade.time * 1000,
    price: trade.price,
  }

  return createTradeLine(chart, props)
}

export function removeTrade(chart: Chart, id: string): void {
  chart.removeOverlay({id})
}

export function removeAllTrades(chart: Chart): void {
  chart.removeOverlay({name: "tradeLine"})
}
