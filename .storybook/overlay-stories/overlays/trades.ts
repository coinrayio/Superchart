import type {Chart, Nullable} from "klinecharts"

export interface Trade {
  time: number
  price: number
  side: "buy" | "sell"
  amount?: number
}

export function createTrade(
  chart: Chart,
  trade: Trade,
  text?: string,
  color?: string,
  textColor?: string,
): Nullable<string> {
  return chart.createOverlay({
    name: "simpleAnnotation",
    points: [{timestamp: trade.time * 1000, value: trade.price}],
    extendData: {
      text: text || "",
      direction: trade.side === "buy" ? "up" : "down",
      color,
      textColor,
    },
    lock: true,
  }) as Nullable<string>
}

export function removeTrade(chart: Chart, id: string): void {
  chart.removeOverlay({id})
}

export function removeAllTrades(chart: Chart): void {
  chart.removeOverlay({name: "simpleAnnotation"})
}
