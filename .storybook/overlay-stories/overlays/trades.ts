import type {Chart, Nullable, OverlayEvent, TradeLine} from "@superchart/index"
import {createTradeLine} from "@superchart/index"

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
  onRightClick?: (event: OverlayEvent<unknown>) => void
}

export function createTrade(
  chart: Chart,
  trade: Trade,
  options?: TradeOptions,
): Nullable<TradeLine> {
  const direction = trade.side === "buy" ? "up" : "down" as const

  return createTradeLine(chart, {
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
    onRightClick: options?.onRightClick,
  })
}

export function removeTrade(chart: Chart, id: string): void {
  chart.removeOverlay({id})
}

export function removeAllTrades(chart: Chart): void {
  chart.removeOverlay({name: "tradeLine"})
}
