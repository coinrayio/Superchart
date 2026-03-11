import {useCallback, useEffect, useRef, useState} from "react"
import type {Meta, StoryObj} from "@storybook/react"
import type {Chart} from "klinecharts"
import {SuperchartCanvas} from "../helpers/SuperchartCanvas"
import {useCurrentPrice} from "../helpers/useCurrentPrice"
import {
  createFibonacciLine, createFibonacciCircle, createFibonacciSegment,
  createFibonacciSpiral, createFibonacciSpeedResistanceFan, createFibonacciExtension,
  removeFibonacci,
} from "./overlays/fibonacci"

type FibType = "fibonacciLine" | "fibonacciCircle" | "fibonacciSegment"
  | "fibonacciSpiral" | "fibonacciSpeedResistanceFan" | "fibonacciExtension"

interface FibonacciArgs {
  fibType: FibType
  symbol: string
}

function FibonacciDemo({fibType, symbol}: FibonacciArgs) {
  const [chart, setChart] = useState<Chart | null>(null)
  const idsRef = useRef<string[]>([])
  const currentPrice = useCurrentPrice(chart)

  const onChart = useCallback((c: Chart) => setChart(c), [])

  const clear = () => {
    if (!chart) return
    idsRef.current.forEach(id => removeFibonacci(chart, id))
    idsRef.current = []
  }

  useEffect(() => {
    if (!chart || !currentPrice) return
    clear()

    const dataList = chart.getDataList()
    if (dataList.length < 60) return

    const len = dataList.length

    // Find a swing high and swing low in the last 50 bars
    let highBar = dataList[len - 50]
    let lowBar = dataList[len - 50]
    for (let i = len - 50; i < len; i++) {
      if (dataList[i].high > highBar.high) highBar = dataList[i]
      if (dataList[i].low < lowBar.low) lowBar = dataList[i]
    }

    // Ensure high comes before low for a downward retracement
    const [swingStart, swingEnd] = highBar.timestamp < lowBar.timestamp
      ? [highBar, lowBar]
      : [lowBar, highBar]

    const p1 = {timestamp: swingStart.timestamp, value: swingStart.high}
    const p2 = {timestamp: swingEnd.timestamp, value: swingEnd.low}

    let id: string | null = null

    if (fibType === "fibonacciExtension") {
      // 3-point: swing high, swing low, retracement
      const midBar = dataList[Math.floor((len - 50 + len) / 2)]
      const p3 = {timestamp: midBar.timestamp, value: (swingStart.high + swingEnd.low) / 2}
      id = createFibonacciExtension(chart, [p1, p2, p3])
    } else {
      switch (fibType) {
        case "fibonacciLine":
          id = createFibonacciLine(chart, [p1, p2])
          break
        case "fibonacciCircle":
          id = createFibonacciCircle(chart, [p1, p2])
          break
        case "fibonacciSegment":
          id = createFibonacciSegment(chart, [p1, p2])
          break
        case "fibonacciSpiral":
          id = createFibonacciSpiral(chart, [p1, p2])
          break
        case "fibonacciSpeedResistanceFan":
          id = createFibonacciSpeedResistanceFan(chart, [p1, p2])
          break
      }
    }

    if (id) idsRef.current.push(id)
    return clear
  }, [chart, currentPrice, fibType])

  return <SuperchartCanvas symbol={symbol} onChart={onChart} />
}

const meta: Meta<typeof FibonacciDemo> = {
  title: "Overlays/Fibonacci",
  component: FibonacciDemo,
  argTypes: {
    fibType: {
      control: "select",
      options: [
        "fibonacciLine", "fibonacciCircle", "fibonacciSegment",
        "fibonacciSpiral", "fibonacciSpeedResistanceFan", "fibonacciExtension",
      ],
      table: {category: "Settings"},
    },
    symbol: {control: "text", table: {category: "Chart"}},
  },
}
export default meta

type Story = StoryObj<typeof FibonacciDemo>

export const FibonacciLine: Story = {
  args: {fibType: "fibonacciLine", symbol: "BINA_USDT_BTC"},
}

export const FibonacciCircle: Story = {
  args: {fibType: "fibonacciCircle", symbol: "BINA_USDT_BTC"},
}

export const FibonacciSegment: Story = {
  args: {fibType: "fibonacciSegment", symbol: "BINA_USDT_BTC"},
}

export const FibonacciSpiral: Story = {
  args: {fibType: "fibonacciSpiral", symbol: "BINA_USDT_BTC"},
}

export const FibonacciSpeedResistanceFan: Story = {
  args: {fibType: "fibonacciSpeedResistanceFan", symbol: "BINA_USDT_BTC"},
}

export const FibonacciExtension: Story = {
  args: {fibType: "fibonacciExtension", symbol: "BINA_USDT_BTC"},
}
