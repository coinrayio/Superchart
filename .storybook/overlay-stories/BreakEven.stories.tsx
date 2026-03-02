import {useCallback, useEffect, useRef, useState} from "react"
import type {Meta, StoryObj} from "@storybook/react"
import type {Chart} from "klinecharts"
import {SuperchartCanvas} from "../helpers/SuperchartCanvas"
import {useCurrentPrice} from "../helpers/useCurrentPrice"
import {createBreakEven, updateBreakEven, removeBreakEven} from "./overlays/break-even"

interface BreakEvenArgs {
  showBreakEven: boolean
  pricePercent: number
  color: string
  symbol: string
}

function BreakEvenDemo({showBreakEven, pricePercent, color, symbol}: BreakEvenArgs) {
  const [chart, setChart] = useState<Chart | null>(null)
  const overlayIdRef = useRef<string | null>(null)
  const currentPrice = useCurrentPrice(chart)

  const onChart = useCallback((c: Chart) => setChart(c), [])

  const resolvedPrice = currentPrice ? currentPrice * (1 + pricePercent / 100) : null

  useEffect(() => {
    if (!chart || !resolvedPrice) return

    if (showBreakEven) {
      if (overlayIdRef.current) {
        updateBreakEven(chart, overlayIdRef.current, resolvedPrice, color)
      } else {
        overlayIdRef.current = createBreakEven(chart, resolvedPrice, color)
      }
    } else if (overlayIdRef.current) {
      removeBreakEven(chart, overlayIdRef.current)
      overlayIdRef.current = null
    }
  }, [chart, showBreakEven, resolvedPrice, color])

  return <SuperchartCanvas symbol={symbol} onChart={onChart} />
}

const meta: Meta<typeof BreakEvenDemo> = {
  title: "Overlays/BreakEven",
  component: BreakEvenDemo,
  argTypes: {
    showBreakEven: {control: "boolean"},
    pricePercent: {control: {type: "number", step: 0.1}, description: "% offset from current price"},
    color: {control: "color", description: "Line and label color"},
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
    symbol: "BINA_USDT_BTC",
  },
}
