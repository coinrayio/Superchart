import {useCallback, useEffect, useRef, useState} from "react"
import type {Meta, StoryObj} from "@storybook/react"
import type {Chart} from "klinecharts"
import {SuperchartCanvas} from "../helpers/SuperchartCanvas"
import {useCurrentPrice} from "../helpers/useCurrentPrice"
import {
  createSegment, createRayLine, createStraightLine,
  createHorizontalStraightLine, createHorizontalRayLine, createHorizontalSegment,
  createVerticalStraightLine, createVerticalRayLine, createVerticalSegment,
  removeOverlay,
} from "./overlays/lines"

type LineType =
  | "segment" | "rayLine" | "straightLine"
  | "horizontalStraightLine" | "horizontalRayLine" | "horizontalSegment"
  | "verticalStraightLine" | "verticalRayLine" | "verticalSegment"

interface LinesArgs {
  lineType: LineType
  color: string
  symbol: string
}

function getDataPoints(chart: Chart, currentPrice: number) {
  const dataList = chart.getDataList()
  if (dataList.length < 30) return null
  const len = dataList.length
  const bar1 = dataList[len - 40] ?? dataList[0]
  const bar2 = dataList[len - 10] ?? dataList[len - 1]
  return {bar1, bar2, currentPrice}
}

function LinesDemo({lineType, color, symbol}: LinesArgs) {
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

    const dp = getDataPoints(chart, currentPrice)
    if (!dp) return

    const {bar1, bar2} = dp
    const p1 = {timestamp: bar1.timestamp, value: bar1.close}
    const p2 = {timestamp: bar2.timestamp, value: bar2.close}

    let id: string | null = null

    switch (lineType) {
      case "segment":
        id = createSegment(chart, [p1, p2], color)
        break
      case "rayLine":
        id = createRayLine(chart, [p1, p2], color)
        break
      case "straightLine":
        id = createStraightLine(chart, [p1, p2], color)
        break
      case "horizontalStraightLine":
        id = createHorizontalStraightLine(chart, currentPrice * 0.99, color)
        break
      case "horizontalRayLine":
        id = createHorizontalRayLine(chart, [p1, {timestamp: p2.timestamp, value: p1.value}], color)
        break
      case "horizontalSegment":
        id = createHorizontalSegment(chart, [p1, {timestamp: p2.timestamp, value: p1.value}], color)
        break
      case "verticalStraightLine":
        id = createVerticalStraightLine(chart, bar1.timestamp, color)
        break
      case "verticalRayLine":
        id = createVerticalRayLine(chart, [p1, {timestamp: p1.timestamp, value: p1.value * 1.02}], color)
        break
      case "verticalSegment":
        id = createVerticalSegment(chart, [
          {timestamp: bar1.timestamp, value: bar1.low},
          {timestamp: bar1.timestamp, value: bar1.high},
        ], color)
        break
    }

    if (id) idsRef.current.push(id)
    return clear
  }, [chart, currentPrice, lineType, color])

  return <SuperchartCanvas symbol={symbol} onChart={onChart} />
}

const meta: Meta<typeof LinesDemo> = {
  title: "Overlays/Lines",
  component: LinesDemo,
  argTypes: {
    lineType: {
      control: "select",
      options: [
        "segment", "rayLine", "straightLine",
        "horizontalStraightLine", "horizontalRayLine", "horizontalSegment",
        "verticalStraightLine", "verticalRayLine", "verticalSegment",
      ],
      table: {category: "Settings"},
    },
    color: {control: "color", table: {category: "Settings"}},
    symbol: {control: "text", table: {category: "Chart"}},
  },
}
export default meta

type Story = StoryObj<typeof LinesDemo>

export const Segment: Story = {
  args: {lineType: "segment", color: "#1677FF", symbol: "BINA_USDT_BTC"},
}

export const RayLine: Story = {
  args: {lineType: "rayLine", color: "#FF6B00", symbol: "BINA_USDT_BTC"},
}

export const StraightLine: Story = {
  args: {lineType: "straightLine", color: "#4CAF50", symbol: "BINA_USDT_BTC"},
}

export const HorizontalStraightLine: Story = {
  args: {lineType: "horizontalStraightLine", color: "#E91E63", symbol: "BINA_USDT_BTC"},
}

export const HorizontalRayLine: Story = {
  args: {lineType: "horizontalRayLine", color: "#9C27B0", symbol: "BINA_USDT_BTC"},
}

export const HorizontalSegment: Story = {
  args: {lineType: "horizontalSegment", color: "#00BCD4", symbol: "BINA_USDT_BTC"},
}

export const VerticalStraightLine: Story = {
  args: {lineType: "verticalStraightLine", color: "#FF9800", symbol: "BINA_USDT_BTC"},
}

export const VerticalRayLine: Story = {
  args: {lineType: "verticalRayLine", color: "#8BC34A", symbol: "BINA_USDT_BTC"},
}

export const VerticalSegment: Story = {
  args: {lineType: "verticalSegment", color: "#607D8B", symbol: "BINA_USDT_BTC"},
}
