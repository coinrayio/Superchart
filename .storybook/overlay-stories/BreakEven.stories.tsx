import {useCallback, useEffect, useRef, useState} from "react"
import type {Meta, StoryObj} from "@storybook/react"
import type {Chart} from "@superchart"
import {SuperchartCanvas} from "../helpers/SuperchartCanvas"
import {useCurrentPrice} from "../helpers/useCurrentPrice"
import {createBreakEven, removeBreakEven, type BreakEvenHandle} from "./overlays/break-even"

interface BreakEvenArgs {
  showBreakEven: boolean
  pricePercent: number
  color: string
  text: string
  symbol: string
}

function BreakEvenDemo({showBreakEven, pricePercent, color, text, symbol}: BreakEvenArgs) {
  const [chart, setChart] = useState<Chart | null>(null)
  const handleRef = useRef<BreakEvenHandle | null>(null)
  const currentPrice = useCurrentPrice(chart)

  const onChart = useCallback((c: Chart) => setChart(c), [])

  const resolvedPrice = currentPrice ? currentPrice * (1 + pricePercent / 100) : null

  useEffect(() => {
    if (!chart || !resolvedPrice) return

    if (showBreakEven) {
      if (handleRef.current) {
        handleRef.current.setPrice(resolvedPrice)
        handleRef.current.setColor(color)
        handleRef.current.setText(text)
      } else {
        handleRef.current = createBreakEven(chart, resolvedPrice, color, text)
      }
    } else if (handleRef.current) {
      removeBreakEven(handleRef.current)
      handleRef.current = null
    }
  }, [chart, showBreakEven, resolvedPrice, color, text])

  return <SuperchartCanvas symbol={symbol} onChart={onChart} />
}

const meta: Meta<typeof BreakEvenDemo> = {
  title: "Overlays/BreakEven",
  component: BreakEvenDemo,
  argTypes: {
    showBreakEven: {control: "boolean", table: {category: "Settings"}},
    pricePercent: {control: {type: "number", step: 0.1}, description: "% offset from current price", table: {category: "Settings"}},
    color: {control: "color", table: {category: "Styling"}},
    text: {control: "text", table: {category: "Label"}},
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
    text: "Break Even",
    symbol: "BINA_USDT_BTC",
  },
}
