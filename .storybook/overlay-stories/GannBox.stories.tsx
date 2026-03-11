import {useCallback, useEffect, useRef, useState} from "react"
import type {Meta, StoryObj} from "@storybook/react"
import type {Chart} from "klinecharts"
import {SuperchartCanvas} from "../helpers/SuperchartCanvas"
import {useCurrentPrice} from "../helpers/useCurrentPrice"
import {createGannBox, removeGannBox} from "./overlays/gann-box"

interface GannBoxArgs {
  showGannBox: boolean
  symbol: string
}

function GannBoxDemo({showGannBox, symbol}: GannBoxArgs) {
  const [chart, setChart] = useState<Chart | null>(null)
  const idsRef = useRef<string[]>([])
  const currentPrice = useCurrentPrice(chart)

  const onChart = useCallback((c: Chart) => setChart(c), [])

  const clear = () => {
    if (!chart) return
    idsRef.current.forEach(id => removeGannBox(chart, id))
    idsRef.current = []
  }

  useEffect(() => {
    if (!chart || !currentPrice) return
    clear()

    if (!showGannBox) return

    const dataList = chart.getDataList()
    if (dataList.length < 40) return

    const len = dataList.length
    const bar1 = dataList[len - 40]
    const bar2 = dataList[len - 10]

    const id = createGannBox(chart, [
      {timestamp: bar1.timestamp, value: bar1.high},
      {timestamp: bar2.timestamp, value: bar2.low},
    ])

    if (id) idsRef.current.push(id)
    return clear
  }, [chart, currentPrice, showGannBox])

  return <SuperchartCanvas symbol={symbol} onChart={onChart} />
}

const meta: Meta<typeof GannBoxDemo> = {
  title: "Overlays/Gann",
  component: GannBoxDemo,
  argTypes: {
    showGannBox: {control: "boolean", table: {category: "Settings"}},
    symbol: {control: "text", table: {category: "Chart"}},
  },
}
export default meta

type Story = StoryObj<typeof GannBoxDemo>

export const Default: Story = {
  args: {showGannBox: true, symbol: "BINA_USDT_BTC"},
}
