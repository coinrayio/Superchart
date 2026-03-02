import type {Chart} from "klinecharts"

export interface Trade {
  time: number
  price: number
  side: "buy" | "sell"
  amount?: number
}

export function createTrade(chart: Chart, trade: Trade, text?: string, color?: string, textColor?: string, markerSymbol?: string): string | null {
  return chart.createOverlay({
    name: "simpleAnnotation",
    points: [{timestamp: trade.time * 1000, value: trade.price}],
    extendData: text || "",
    styles: {
      ...(color ? {symbol: {color}} : {}),
      ...(textColor ? {text: {color: textColor}} : {}),
      // handle symbol type
      // ...(markerSymbol ? {symbol: {type: markerSymbol, ...(color ? {color} : {})}} : {}),
    },
    lock: true,
  })
}

export function removeTrade(chart: Chart, id: string): void {
  chart.removeOverlay({id})
}

export function removeAllTrades(chart: Chart): void {
  chart.removeOverlay({name: "simpleAnnotation"})
}
