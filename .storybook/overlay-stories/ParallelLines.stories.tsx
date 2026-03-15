import {useCallback, useEffect, useRef, useState} from "react"
import type {Meta, StoryObj} from "@storybook/react"
import type {Chart} from "klinecharts"
import {SuperchartCanvas} from "../helpers/SuperchartCanvas"
import {useCurrentPrice} from "../helpers/useCurrentPrice"
import {createParallelStraightLine, createPriceChannelLine, removeOverlay} from "./overlays/lines"

type ParallelType = "parallelStraightLine" | "priceChannelLine"

interface ParallelLinesArgs {
  lineType: ParallelType
  color: string
  symbol: string
}

function ParallelLinesDemo({lineType, color, symbol}: ParallelLinesArgs) {
  const [chart, setChart] = useState<Chart | null>(null)
  const idsRef = useRef<string[]>([])
  const currentPrice = useCurrentPrice(chart)

  const onChart = useCallback((c: Chart) => setChart(c), [])

  const clear = () => {
    if (!chart) return
    idsRef.current.forEach(id => removeOverlay(chart, id))
    idsRef.current = []
  }

  useEffect(() => {
    if (!chart || !currentPrice) return
    clear()

    const dataList = chart.getDataList()
    if (dataList.length < 40) return

    const len = dataList.length
    const bar1 = dataList[len - 50] ?? dataList[0]
    const bar2 = dataList[len - 20] ?? dataList[len - 1]
    const bar3Idx = Math.floor((len - 50 + len - 20) / 2)
    const bar3 = dataList[bar3Idx] ?? dataList[Math.floor(len / 2)]

    // Two points define the first line, third point defines the parallel offset
    const p1 = {timestamp: bar1.timestamp, value: bar1.low}
    const p2 = {timestamp: bar2.timestamp, value: bar2.low}
    const p3 = {timestamp: bar3.timestamp, value: bar3.high}

    let id: string | null = null
    if (lineType === "parallelStraightLine") {
      id = createParallelStraightLine(chart, [p1, p2, p3], color)
    } else {
      id = createPriceChannelLine(chart, [p1, p2, p3], color)
    }

    if (id) idsRef.current.push(id)
    return clear
  }, [chart, currentPrice, lineType, color])

  return <SuperchartCanvas symbol={symbol} onChart={onChart} />
}

const meta: Meta<typeof ParallelLinesDemo> = {
  title: "Overlays/ParallelLines",
  component: ParallelLinesDemo,
  argTypes: {
    lineType: {
      control: "select",
      options: ["parallelStraightLine", "priceChannelLine"],
      table: {category: "Settings"},
    },
    color: {control: "color", table: {category: "Settings"}},
    symbol: {control: "text", table: {category: "Chart"}},
  },
}
export default meta

type Story = StoryObj<typeof ParallelLinesDemo>

export const ParallelStraightLine: Story = {
  args: {lineType: "parallelStraightLine", color: "#1677FF", symbol: "BINA_USDT_BTC"},
}

export const PriceChannelLine: Story = {
  args: {lineType: "priceChannelLine", color: "#FF6B00", symbol: "BINA_USDT_BTC"},
}
