import {useCallback, useEffect, useRef, useState} from "react"
import type {Meta, StoryObj} from "@storybook/react"
import type {Chart} from "@superchart"
import {SuperchartCanvas} from "../helpers/SuperchartCanvas"
import {useCurrentPrice} from "../helpers/useCurrentPrice"
import {createArrow, createCircle, createRect, createTriangle, createParallelogram, removeShape} from "./overlays/shapes"

type ShapeType = "arrow" | "circle" | "rect" | "triangle" | "parallelogram"

interface ShapesArgs {
  shapeType: ShapeType
  symbol: string
}

function ShapesDemo({shapeType, symbol}: ShapesArgs) {
  const [chart, setChart] = useState<Chart | null>(null)
  const idsRef = useRef<string[]>([])
  const currentPrice = useCurrentPrice(chart)

  const onChart = useCallback((c: Chart) => setChart(c), [])

  const clear = () => {
    if (!chart) return
    idsRef.current.forEach(id => removeShape(chart, id))
    idsRef.current = []
  }

  useEffect(() => {
    if (!chart || !currentPrice) return
    clear()

    const dataList = chart.getDataList()
    if (dataList.length < 40) return

    const len = dataList.length
    const bar1 = dataList[len - 40]
    const bar2 = dataList[len - 15]
    const bar3 = dataList[len - 28]

    const p1 = {timestamp: bar1.timestamp, value: currentPrice * 1.01}
    const p2 = {timestamp: bar2.timestamp, value: currentPrice * 0.99}
    const p3 = {timestamp: bar3.timestamp, value: currentPrice * 1.02}

    let id: string | null = null

    switch (shapeType) {
      case "arrow":
        id = createArrow(chart, [p1, p2])
        break
      case "circle":
        id = createCircle(chart, [
          {timestamp: bar3.timestamp, value: currentPrice},
          {timestamp: bar2.timestamp, value: currentPrice * 1.01},
        ])
        break
      case "rect":
        id = createRect(chart, [p1, p2])
        break
      case "triangle":
        id = createTriangle(chart, [p1, p2, p3])
        break
      case "parallelogram":
        id = createParallelogram(chart, [p1, p2, p3])
        break
    }

    if (id) idsRef.current.push(id)
    return clear
  }, [chart, currentPrice, shapeType])

  return <SuperchartCanvas symbol={symbol} onChart={onChart} />
}

const meta: Meta<typeof ShapesDemo> = {
  title: "Overlays/Shapes",
  component: ShapesDemo,
  argTypes: {
    shapeType: {
      control: "select",
      options: ["arrow", "circle", "rect", "triangle", "parallelogram"],
      table: {category: "Settings"},
    },
    symbol: {control: "text", table: {category: "Chart"}},
  },
}
export default meta

type Story = StoryObj<typeof ShapesDemo>

export const Arrow: Story = {
  args: {shapeType: "arrow", symbol: "BINA_USDT_BTC"},
}

export const Circle: Story = {
  args: {shapeType: "circle", symbol: "BINA_USDT_BTC"},
}

export const Rect: Story = {
  args: {shapeType: "rect", symbol: "BINA_USDT_BTC"},
}

export const Triangle: Story = {
  args: {shapeType: "triangle", symbol: "BINA_USDT_BTC"},
}

export const Parallelogram: Story = {
  args: {shapeType: "parallelogram", symbol: "BINA_USDT_BTC"},
}
