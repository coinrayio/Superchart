import {useCallback, useEffect, useRef, useState} from "react"
import type {Meta, StoryObj} from "@storybook/react"
import type {Chart, TradeLine} from "klinecharts"
import {SuperchartCanvas} from "../helpers/SuperchartCanvas"
import {createTrade, removeAllTrades} from "./overlays/trades"

const HARDCODED_AMOUNTS = [0.15, 0.42, 1.03, 0.07, 0.88, 0.31, 2.5, 0.19, 0.64, 1.12]
const SIDES: Array<"buy" | "sell"> = ["buy", "sell"]

interface TradesArgs {
  arrowType: "wide" | "arrow" | "tiny"
  showAmount: boolean
  showPrice: boolean
  buyColor: string
  sellColor: string
  labelColor: string
  textFontSize: number
  textGap: number
  gap: number
  numTrades: number
  spacingHours: number
  symbol: string
}

interface TradeEntry {
  tradeLine: TradeLine
  side: "buy" | "sell"
  amount: number
  price: number
}

function formatLabel(side: string, amount: number, price: number, showAmount: boolean, showPrice: boolean): string {
  const parts: string[] = [side === "buy" ? "Buy" : "Sell"]
  if (showAmount) parts.push(`${amount}`)
  if (showPrice) parts.push(`@${price.toFixed(2)}`)
  return parts.join(" ")
}

function TradesDemo({arrowType, numTrades, spacingHours, showAmount, showPrice, buyColor, sellColor, labelColor, textFontSize, textGap, gap, symbol}: TradesArgs) {
  const [chart, setChart] = useState<Chart | null>(null)
  const tradesRef = useRef<TradeEntry[]>([])

  const onChart = useCallback((c: Chart) => setChart(c), [])

  // Creation effect — only runs when structural parameters change
  useEffect(() => {
    if (!chart) return

    const create = (chart: Chart) => {
      const dataList = chart.getDataList()
      if (!dataList.length) return

      const now = Date.now() / 1000
      for (let i = 0; i < numTrades; i++) {
        const approxTime = now - (i + 1) * spacingHours * 3600
        const timeMs = approxTime * 1000
        let match = dataList[0]
        for (const bar of dataList) {
          if (bar.timestamp <= timeMs) match = bar
          else break
        }

        const side = SIDES[i % SIDES.length]
        const amount = HARDCODED_AMOUNTS[i % HARDCODED_AMOUNTS.length]
        const price = side === "buy" ? match.low : match.high
        const label = formatLabel(side, amount, price, showAmount, showPrice)
        const color = side === "buy" ? buyColor : sellColor

        const tradeLine = createTrade(
          chart,
          {time: match.timestamp / 1000, price, side, amount},
          {arrowType, color, textColor: labelColor, text: label, textFontSize, textGap, gap},
        )
        if (tradeLine) {
          tradesRef.current.push({tradeLine, side, amount, price})
        }
      }
    }

    removeAllTrades(chart)
    tradesRef.current = []

    const dataList = chart.getDataList()
    if (dataList.length) {
      create(chart)
    } else {
      const timer = setTimeout(() => create(chart), 500)
      return () => clearTimeout(timer)
    }

    return () => {
      removeAllTrades(chart)
      tradesRef.current = []
    }
  }, [chart, numTrades, spacingHours])

  // Update effect — uses fluent API setters for style/display changes
  useEffect(() => {
    for (const entry of tradesRef.current) {
      const {tradeLine, side, amount, price} = entry
      const color = side === "buy" ? buyColor : sellColor
      const label = formatLabel(side, amount, price, showAmount, showPrice)

      tradeLine
        .setArrowType(arrowType)
        .setColor(color)
        .setTextColor(labelColor)
        .setTextFontSize(textFontSize)
        .setTextGap(textGap)
        .setGap(gap)
        .setText(label)
    }
  }, [arrowType, buyColor, sellColor, labelColor, textFontSize, textGap, gap, showAmount, showPrice])

  return <SuperchartCanvas symbol={symbol} onChart={onChart} />
}

const meta: Meta<typeof TradesDemo> = {
  title: "Overlays/Trades",
  component: TradesDemo,
  argTypes: {
    arrowType: {control: "select", options: ["wide", "arrow", "tiny"], description: "Arrow visual style", table: {category: "Arrow"}},
    gap: {control: {type: "number", min: 0, max: 20, step: 1}, description: "Pixel gap between arrow and candle", table: {category: "Arrow"}},
    showAmount: {control: "boolean", description: "Show amount in label", table: {category: "Label"}},
    showPrice: {control: "boolean", description: "Show price in label", table: {category: "Label"}},
    textFontSize: {control: {type: "number", min: 6, max: 24, step: 1}, description: "Text font size (px)", table: {category: "Text"}},
    textGap: {control: {type: "number", min: 0, max: 20, step: 1}, description: "Pixel gap between text and arrow", table: {category: "Text"}},
    buyColor: {control: "color", description: "Buy arrow color", table: {category: "Colors"}},
    sellColor: {control: "color", description: "Sell arrow color", table: {category: "Colors"}},
    labelColor: {control: "color", description: "Label text color", table: {category: "Colors"}},
    numTrades: {control: {type: "number", min: 1, max: 100, step: 1}, description: "Number of trades to show", table: {category: "Demo Data"}},
    spacingHours: {control: {type: "number", min: 0.5, step: 0.5}, description: "Hours between each trade", table: {category: "Demo Data"}},
    symbol: {control: "text", table: {category: "Chart"}},
  },
}
export default meta

type Story = StoryObj<typeof TradesDemo>

export const WideArrows: Story = {
  args: {
    arrowType: "wide",
    gap: 4,
    showAmount: true,
    showPrice: true,
    textFontSize: 12,
    textGap: 2,
    buyColor: "#4CAF50",
    sellColor: "#F44336",
    labelColor: "#E0E0FF",
    numTrades: 10,
    spacingHours: 2,
    symbol: "BINA_USDT_BTC",
  },
}

export const LineArrows: Story = {
  args: {
    ...WideArrows.args,
    arrowType: "arrow",
  },
}

export const TinyArrows: Story = {
  args: {
    ...WideArrows.args,
    arrowType: "tiny",
  },
}
