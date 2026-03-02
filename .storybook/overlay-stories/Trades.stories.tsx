import {useCallback, useEffect, useRef, useState} from "react"
import type {Meta, StoryObj} from "@storybook/react"
import type {Chart} from "klinecharts"
import {SuperchartCanvas} from "../helpers/SuperchartCanvas"
import {createTrade, removeTrade} from "./overlays/trades"

const HARDCODED_AMOUNTS = [0.15, 0.42, 1.03, 0.07, 0.88, 0.31, 2.5, 0.19, 0.64, 1.12]
const SIDES: Array<"buy" | "sell"> = ["buy", "sell"]

interface TradesArgs {
  showAmount: boolean
  showPrice: boolean
  buyColor: string
  sellColor: string
  textColor: string
  markerSymbol: string
  numTrades: number
  spacingHours: number
  symbol: string
}

function formatLabel(side: string, amount: number, price: number, showAmount: boolean, showPrice: boolean): string {
  const parts: string[] = [side]
  if (showAmount) parts.push(`${amount}`)
  if (showAmount && showPrice) parts.push(`@${price.toFixed(2)}`)
  else if (showPrice) parts.push(`@${price.toFixed(2)}`)
  return parts.join(" ")
}

function TradesDemo({numTrades, spacingHours, showAmount, showPrice, buyColor, sellColor, textColor, markerSymbol, symbol}: TradesArgs) {
  const [chart, setChart] = useState<Chart | null>(null)
  const idsRef = useRef<string[]>([])

  const onChart = useCallback((c: Chart) => setChart(c), [])

  // Find the candle containing the given time (last candle with open <= time).
  // Returns the candle's open timestamp (seconds) and close price.
  // Resolution-proof: works regardless of candle period.
  const snapToCandle = (chart: Chart, timeSeconds: number): {time: number, close: number} | null => {
    const dataList = chart.getDataList()
    if (!dataList.length) return null
    const timeMs = timeSeconds * 1000
    let match = dataList[0]
    for (const bar of dataList) {
      if (bar.timestamp <= timeMs) match = bar
      else break
    }
    return {time: match.timestamp / 1000, low: match.low, high: match.high}
  }

  const createAll = (chart: Chart) => {
    const now = Date.now() / 1000
    for (let i = 0; i < numTrades; i++) {
      const approxTime = now - (i + 1) * spacingHours * 3600
      const candle = snapToCandle(chart, approxTime)
      if (!candle) continue
      const side = SIDES[i % SIDES.length]
      const amount = HARDCODED_AMOUNTS[i % HARDCODED_AMOUNTS.length]
      const price = side === "buy" ? candle.low : candle.high
      const label = formatLabel(side, amount, price, showAmount, showPrice)
      const color = side === "buy" ? buyColor : sellColor
      const id = createTrade(chart, {time: candle.time, price, side, amount}, label, color, textColor, markerSymbol)
      if (id) idsRef.current.push(id)
    }
  }

  const removeAll = (chart: Chart) => {
    for (const id of idsRef.current) removeTrade(chart, id)
    idsRef.current = []
  }

  useEffect(() => {
    if (!chart) return

    removeAll(chart)

    const dataList = chart.getDataList()
    if (dataList.length) {
      createAll(chart)
    } else {
      const timer = setTimeout(() => createAll(chart), 500)
      return () => clearTimeout(timer)
    }

    return () => removeAll(chart)
  }, [chart, numTrades, spacingHours, showAmount, showPrice, buyColor, sellColor, textColor, markerSymbol])

  return <SuperchartCanvas symbol={symbol} onChart={onChart} />
}

const meta: Meta<typeof TradesDemo> = {
  title: "Overlays/Trades",
  component: TradesDemo,
  argTypes: {
    showAmount: {control: "boolean", description: "Show amount in label"},
    showPrice: {control: "boolean", description: "Show price in label"},
    buyColor: {control: "color", description: "Buy marker color"},
    sellColor: {control: "color", description: "Sell marker color"},
    textColor: {control: "color", description: "Label text color"},
    markerSymbol: {control: "inline-radio", options: ["thick-arrow", "thin-arrow", "triangle"], description: "Marker shape"},
    numTrades: {control: {type: "number", min: 1, max: 10, step: 1}, description: "Number of trades to show"},
    spacingHours: {control: {type: "number", min: 0.5, step: 0.5}, description: "Hours between each trade"},
    symbol: {control: "text", table: {category: "Chart"}},
  },
}
export default meta

type Story = StoryObj<typeof TradesDemo>

export const Default: Story = {
  args: {
    showAmount: true,
    showPrice: true,
    buyColor: "#4CAF50",
    sellColor: "#F44336",
    textColor: "#FFFFFF",
    markerSymbol: "thick-arrow",
    numTrades: 10,
    spacingHours: 2,
    symbol: "BINA_USDT_BTC",
  },
}
