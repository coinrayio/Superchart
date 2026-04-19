/**
 * Multi-instance bug demo.
 *
 * Two Superchart instances side by side, each with its own order line.
 * Chart A (left) gets a green BUY line, Chart B (right) gets a red SELL line.
 *
 * Expected: each line appears on its own chart, each chart shows its own symbol.
 * Actual: both lines appear on Chart B, both charts show the same symbol,
 *         because chartStore is a module-level singleton.
 */
import {useEffect, useRef, useState} from "react"
import type {Meta, StoryObj} from "@storybook/react"
import {Superchart, createDataLoader, createOrderLine} from "@superchart/index"
import type {Chart} from "@superchart/index"
import {CoinrayDatafeed} from "../helpers/CoinrayDatafeed"
import {useCurrentPrice} from "../helpers/useCurrentPrice"

const TOKEN = import.meta.env.VITE_COINRAY_TOKEN || ""

const BUY_COLOR = "#43B581"
const SELL_COLOR = "#F15959"

function useSuperchart(containerRef: React.RefObject<HTMLDivElement | null>, symbol: string) {
  const [chart, setChart] = useState<Chart | null>(null)
  const superchartRef = useRef<Superchart | null>(null)

  useEffect(() => {
    if (!containerRef.current || !TOKEN) return

    const datafeed = new CoinrayDatafeed(TOKEN)
    const dataLoader = createDataLoader(datafeed)

    const superchart = new Superchart({
      container: containerRef.current,
      symbol: {ticker: symbol, pricePrecision: 2, volumePrecision: 0},
      period: {type: "hour", span: 1, text: "1H"},
      dataLoader,
      theme: "dark",
      debug: false,
    })

    superchartRef.current = superchart

    const id = setInterval(() => {
      const kc = superchart.getChart()
      if (kc) {
        clearInterval(id)
        setChart(kc)
      }
    }, 100)

    return () => {
      clearInterval(id)
      superchart.dispose()
      datafeed.dispose()
    }
  }, [])

  return {chart, superchart: superchartRef}
}

function MultiChartDemo() {
  const containerA = useRef<HTMLDivElement>(null)
  const containerB = useRef<HTMLDivElement>(null)

  const {chart: chartA} = useSuperchart(containerA, "BINA_USDT_BTC")
  const {chart: chartB} = useSuperchart(containerB, "BINA_USDT_ETH")

  const priceA = useCurrentPrice(chartA)
  const priceB = useCurrentPrice(chartB)

  // Create order lines once both charts have data
  useEffect(() => {
    if (!chartA || !chartB || !priceA || !priceB) return

    // Green BUY on Chart A
    const lineA = createOrderLine(chartA, {
      price: priceA * 0.99,
      text: "BUY (CHART A)",
      quantity: "This should be on the LEFT chart",
      editable: false,
      lineColor: BUY_COLOR,
      bodyTextColor: "#fff",
      bodyBackgroundColor: BUY_COLOR,
      bodyBorderColor: BUY_COLOR,
      quantityTextColor: "#fff",
      quantityBackgroundColor: BUY_COLOR,
      quantityBorderColor: BUY_COLOR,
      yAxisLabelTextColor: "#fff",
      yAxisLabelBackgroundColor: BUY_COLOR,
      yAxisLabelBorderColor: BUY_COLOR,
    })

    // Red SELL on Chart B
    const lineB = createOrderLine(chartB, {
      price: priceB * 1.01,
      text: "SELL (CHART B)",
      quantity: "This should be on the RIGHT chart",
      editable: false,
      lineColor: SELL_COLOR,
      bodyTextColor: "#fff",
      bodyBackgroundColor: SELL_COLOR,
      bodyBorderColor: SELL_COLOR,
      quantityTextColor: "#fff",
      quantityBackgroundColor: SELL_COLOR,
      quantityBorderColor: SELL_COLOR,
      yAxisLabelTextColor: "#fff",
      yAxisLabelBackgroundColor: SELL_COLOR,
      yAxisLabelBorderColor: SELL_COLOR,
    })

    return () => {
      lineA?.remove()
      lineB?.remove()
    }
  }, [chartA, chartB, priceA, priceB])

  if (!TOKEN) {
    return (
      <div style={{padding: 20, color: "#f44", fontFamily: "monospace"}}>
        Set VITE_COINRAY_TOKEN in .storybook/.env
      </div>
    )
  }

  return (
    <div style={{display: "flex", flexDirection: "column", height: "100vh", background: "#111"}}>
      <div style={{padding: "8px 16px", fontFamily: "monospace", fontSize: 13, color: "#ccc", borderBottom: "1px solid #333"}}>
        Two independent Superchart instances. Chart A = BTC with green BUY line. Chart B = ETH with red SELL line.
      </div>
      <div style={{display: "flex", flex: 1, gap: 2}}>
        <div style={{flex: 1, display: "flex", flexDirection: "column"}}>
          <div style={{padding: "6px 12px", background: "#1a1a2e", color: BUY_COLOR, fontFamily: "monospace", fontSize: 12}}>
            Chart A — BTC/USDT — should have green BUY line
          </div>
          <div ref={containerA} style={{flex: 1}} />
        </div>
        <div style={{flex: 1, display: "flex", flexDirection: "column"}}>
          <div style={{padding: "6px 12px", background: "#1a1a2e", color: SELL_COLOR, fontFamily: "monospace", fontSize: 12}}>
            Chart B — ETH/USDT — should have red SELL line
          </div>
          <div ref={containerB} style={{flex: 1}} />
        </div>
      </div>
    </div>
  )
}

const meta: Meta<typeof MultiChartDemo> = {
  title: "API/MultiChart",
  component: MultiChartDemo,
}
export default meta

type Story = StoryObj<typeof MultiChartDemo>

export const Default: Story = {}
