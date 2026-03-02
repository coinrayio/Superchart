import {useEffect, useRef} from "react"
import {Superchart, createDataLoader} from "@superchart/index"
import type {Chart} from "klinecharts"
import {CoinrayDatafeed} from "./CoinrayDatafeed"

const TOKEN = import.meta.env.VITE_COINRAY_TOKEN || ""

interface Props {
  symbol?: string
  period?: string
  theme?: "dark" | "light"
  onReady?: (superchart: Superchart) => void
  onChart?: (chart: Chart) => void
}

export function SuperchartCanvas({
  symbol = "BINA_USDT_BTC",
  period = "1H",
  theme = "dark",
  onReady,
  onChart,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || !TOKEN) return

    const datafeed = new CoinrayDatafeed(TOKEN)
    const dataLoader = createDataLoader(datafeed)

    const superchart = new Superchart({
      container: containerRef.current,
      symbol: {ticker: symbol, pricePrecision: 2, volumePrecision: 0},
      period: {type: "hour", span: 1, text: period},
      dataLoader,
      theme,
      debug: false
    })

    onReady?.(superchart)

    // WORKAROUND: Superchart has no onReady callback.
    // Ideal API: superchart.onReady((chart) => { ... })
    // Reality: poll getChart() until it's non-null.
    const id = setInterval(() => {
      const kc = superchart.getChart()
      if (kc) {
        clearInterval(id)
        onChart?.(kc)
      }
    }, 100)


    return () => {
      clearInterval(id)
      superchart.dispose()
      datafeed.dispose()
    }
  }, [symbol, theme])

  if (!TOKEN) {
    return (
      <div style={{padding: 20, color: "#f44", fontFamily: "monospace"}}>
        Set VITE_COINRAY_TOKEN in .storybook/.env
      </div>
    )
  }

  return <div ref={containerRef} style={{width: "100%", height: "100vh"}} />
}
