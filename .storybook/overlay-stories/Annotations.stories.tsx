import {useCallback, useEffect, useRef, useState} from "react"
import type {Meta, StoryObj} from "@storybook/react"
import type {Chart} from "@superchart"
import {SuperchartCanvas} from "../helpers/SuperchartCanvas"
import {useCurrentPrice} from "../helpers/useCurrentPrice"
import {createSimpleTag, createFreePath, createBrush, removeAnnotation} from "./overlays/annotations"

type AnnotationType = "simpleTag" | "freePath" | "brush"

interface AnnotationsArgs {
  annotationType: AnnotationType
  tagText: string
  symbol: string
}

function AnnotationsDemo({annotationType, tagText, symbol}: AnnotationsArgs) {
  const [chart, setChart] = useState<Chart | null>(null)
  const idsRef = useRef<string[]>([])
  const currentPrice = useCurrentPrice(chart)

  const onChart = useCallback((c: Chart) => setChart(c), [])

  const clear = () => {
    if (!chart) return
    idsRef.current.forEach(id => removeAnnotation(chart, id))
    idsRef.current = []
  }

  useEffect(() => {
    if (!chart || !currentPrice) return
    clear()

    const dataList = chart.getDataList()
    if (dataList.length < 30) return

    const len = dataList.length
    let id: string | null = null

    switch (annotationType) {
      case "simpleTag": {
        const bar = dataList[len - 20]
        id = createSimpleTag(chart, {timestamp: bar.timestamp, value: bar.high}, tagText)
        break
      }
      case "freePath":
      case "brush": {
        // Create a series of points to simulate a freehand path
        const points = []
        for (let i = 0; i < 15; i++) {
          const bar = dataList[len - 30 + i * 2]
          if (bar) {
            const offset = Math.sin(i * 0.8) * currentPrice * 0.005
            points.push({timestamp: bar.timestamp, value: bar.close + offset})
          }
        }
        if (points.length > 2) {
          id = annotationType === "freePath"
            ? createFreePath(chart, points)
            : createBrush(chart, points)
        }
        break
      }
    }

    if (id) idsRef.current.push(id)
    return clear
  }, [chart, currentPrice, annotationType, tagText])

  return <SuperchartCanvas symbol={symbol} onChart={onChart} />
}

const meta: Meta<typeof AnnotationsDemo> = {
  title: "Overlays/Annotations",
  component: AnnotationsDemo,
  argTypes: {
    annotationType: {
      control: "select",
      options: ["simpleTag", "freePath", "brush"],
      table: {category: "Settings"},
    },
    tagText: {control: "text", table: {category: "Settings"}},
    symbol: {control: "text", table: {category: "Chart"}},
  },
}
export default meta

type Story = StoryObj<typeof AnnotationsDemo>

export const SimpleTag: Story = {
  args: {annotationType: "simpleTag", tagText: "Support", symbol: "BINA_USDT_BTC"},
}

export const FreePath: Story = {
  args: {annotationType: "freePath", tagText: "", symbol: "BINA_USDT_BTC"},
}

export const Brush: Story = {
  args: {annotationType: "brush", tagText: "", symbol: "BINA_USDT_BTC"},
}
