import {useCallback, useEffect, useRef, useState} from "react"
import type {Meta, StoryObj} from "@storybook/react"
import type {Chart} from "klinecharts"
import {SuperchartCanvas} from "../helpers/SuperchartCanvas"
import {useCurrentPrice} from "../helpers/useCurrentPrice"
import {createAbcd, createXabcd, removeHarmonic} from "./overlays/harmonic-patterns"

type HarmonicType = "abcd" | "xabcd"

interface HarmonicArgs {
  patternType: HarmonicType
  symbol: string
}

function HarmonicPatternsDemo({patternType, symbol}: HarmonicArgs) {
  const [chart, setChart] = useState<Chart | null>(null)
  const idsRef = useRef<string[]>([])
  const currentPrice = useCurrentPrice(chart)

  const onChart = useCallback((c: Chart) => setChart(c), [])

  const clear = () => {
    if (!chart) return
    idsRef.current.forEach(id => removeHarmonic(chart, id))
    idsRef.current = []
  }

  useEffect(() => {
    if (!chart || !currentPrice) return
    clear()

    const dataList = chart.getDataList()
    if (dataList.length < 50) return

    const len = dataList.length
    let id: string | null = null

    if (patternType === "abcd") {
      // ABCD: 4 points — A(high), B(low), C(high), D(low)
      const a = dataList[len - 45]
      const b = dataList[len - 33]
      const c = dataList[len - 20]
      const d = dataList[len - 8]
      id = createAbcd(chart, [
        {timestamp: a.timestamp, value: a.high},
        {timestamp: b.timestamp, value: b.low},
        {timestamp: c.timestamp, value: c.high},
        {timestamp: d.timestamp, value: d.low},
      ])
    } else {
      // XABCD: 5 points — X(low), A(high), B(low), C(high), D(low)
      const x = dataList[len - 48]
      const a = dataList[len - 38]
      const b = dataList[len - 28]
      const c = dataList[len - 18]
      const d = dataList[len - 8]
      id = createXabcd(chart, [
        {timestamp: x.timestamp, value: x.low},
        {timestamp: a.timestamp, value: a.high},
        {timestamp: b.timestamp, value: b.low},
        {timestamp: c.timestamp, value: c.high},
        {timestamp: d.timestamp, value: d.low},
      ])
    }

    if (id) idsRef.current.push(id)
    return clear
  }, [chart, currentPrice, patternType])

  return <SuperchartCanvas symbol={symbol} onChart={onChart} />
}

const meta: Meta<typeof HarmonicPatternsDemo> = {
  title: "Overlays/Harmonic",
  component: HarmonicPatternsDemo,
  argTypes: {
    patternType: {
      control: "select",
      options: ["abcd", "xabcd"],
      table: {category: "Settings"},
    },
    symbol: {control: "text", table: {category: "Chart"}},
  },
}
export default meta

type Story = StoryObj<typeof HarmonicPatternsDemo>

export const ABCD: Story = {
  args: {patternType: "abcd", symbol: "BINA_USDT_BTC"},
}

export const XABCD: Story = {
  args: {patternType: "xabcd", symbol: "BINA_USDT_BTC"},
}
