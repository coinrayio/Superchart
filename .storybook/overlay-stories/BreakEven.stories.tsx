import {useCallback, useEffect, useRef, useState} from "react"
import type {Meta, StoryObj} from "@storybook/react"
import type {Chart} from "@superchart"
import type {PriceLine} from "@superchart/index"
import {SuperchartCanvas} from "../helpers/SuperchartCanvas"
import {useCurrentPrice} from "../helpers/useCurrentPrice"
import {createBreakEven, updateBreakEven, removeBreakEven} from "./overlays/break-even"

interface BreakEvenArgs {
  showBreakEven: boolean
  pricePercent: number
  color: string
  labelPosition: "above" | "below" | "center"
  labelAlign: "left" | "center" | "right"
  editable: boolean
  symbol: string
}

function BreakEvenDemo({showBreakEven, pricePercent, color, labelPosition, labelAlign, editable, symbol}: BreakEvenArgs) {
  const [chart, setChart] = useState<Chart | null>(null)
  const lineRef = useRef<PriceLine | null>(null)
  const currentPrice = useCurrentPrice(chart)

  const onChart = useCallback((c: Chart) => setChart(c), [])

  const resolvedPrice = currentPrice ? currentPrice * (1 + pricePercent / 100) : null

  useEffect(() => {
    if (!chart || !resolvedPrice) return

    if (showBreakEven) {
      if (lineRef.current) {
        updateBreakEven(lineRef.current, resolvedPrice, color)
        lineRef.current
          .setLabelPosition(labelPosition)
          .setLabelAlign(labelAlign)
          .setEditable(editable)
      } else {
        lineRef.current = createBreakEven(chart, resolvedPrice, color)
          .setLabelPosition(labelPosition)
          .setLabelAlign(labelAlign)
          .setEditable(editable)
      }
    } else if (lineRef.current) {
      removeBreakEven(lineRef.current)
      lineRef.current = null
    }
  }, [chart, showBreakEven, resolvedPrice, color, labelPosition, labelAlign, editable])

  return <SuperchartCanvas symbol={symbol} onChart={onChart} />
}

const meta: Meta<typeof BreakEvenDemo> = {
  title: "Overlays/BreakEven",
  component: BreakEvenDemo,
  argTypes: {
    showBreakEven: {control: "boolean", table: {category: "Settings"}},
    pricePercent: {control: {type: "number", step: 0.1}, description: "% offset from current price", table: {category: "Settings"}},
    color: {control: "color", table: {category: "Styling"}},
    labelPosition: {control: "inline-radio", options: ["above", "below", "center"], table: {category: "Label"}},
    labelAlign: {control: "inline-radio", options: ["left", "center", "right"], table: {category: "Label"}},
    editable: {control: "boolean", description: "Double-click label to edit", table: {category: "Label"}},
    symbol: {control: "text", table: {category: "Chart"}},
  },
}
export default meta

type Story = StoryObj<typeof BreakEvenDemo>

export const Default: Story = {
  args: {
    showBreakEven: true,
    pricePercent: 1,
    color: "#D05DDF",
    labelPosition: "below",
    labelAlign: "right",
    editable: true,
    symbol: "BINA_USDT_BTC",
  },
}
