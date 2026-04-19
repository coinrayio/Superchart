import {useEffect, useRef, useState} from "react"
import type {Meta, StoryObj} from "@storybook/react"
import {Superchart, createDataLoader} from "@superchart/index"
import {CoinrayDatafeed} from "../helpers/CoinrayDatafeed"
import {waitForReady} from "../overlay-stories/overlays/on-ready"

const TOKEN = import.meta.env.VITE_COINRAY_TOKEN || ""

interface OnReadyArgs {
  symbol: string
}

function OnReadyDemo({symbol}: OnReadyArgs) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isReady, setIsReady] = useState(false)
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

    const cleanup = waitForReady(superchart, () => setIsReady(true))

    return () => {
      cleanup()
      superchart.dispose()
      datafeed.dispose()
    }
  }, [])


  return (
    <div style={{position: "relative", width: "100%", height: "100vh"}}>
      <div ref={containerRef} style={{width: "100%", height: "100%"}}/>
      {isReady && !superchartRef.current?.getChart() && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 9999,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: "#1a1a2e", color: "#f44", fontSize: 16, fontFamily: "monospace",
        }}>
          <div>
            Loaded without chart object
          </div>
          <div>
            superchartRef.current?.getChart(): {JSON.stringify(superchartRef.current?.getChart())}
          </div>
        </div>
      )}
      {!isReady && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "#1a1a2e", color: "#888", fontSize: 16, fontFamily: "monospace",
        }}>
          Loading...
        </div>
      )}
    </div>
  )
}

const meta: Meta<typeof OnReadyDemo> = {
  title: "API/OnReady",
  component: OnReadyDemo,
  argTypes: {
    symbol: {control: "text", table: {category: "Chart"}},
  },
}
export default meta

type Story = StoryObj<typeof OnReadyDemo>

export const Default: Story = {
  args: {
    symbol: "BINA_USDT_BTC",
  },
}
