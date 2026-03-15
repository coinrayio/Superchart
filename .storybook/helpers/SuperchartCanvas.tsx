import {useEffect, useRef} from "react"
import {Superchart, createDataLoader} from "@superchart/index"
import type {Chart} from "klinecharts"
import type {SymbolInfo, Period, VisibleTimeRange} from "@superchart/index"
import {CoinrayDatafeed} from "./CoinrayDatafeed"

const TOKEN = import.meta.env.VITE_COINRAY_TOKEN || ""

const PERIOD_MAP: Record<string, Period> = {
  "1m":  {span: 1,  type: "minute", text: "1m"},
  "3m":  {span: 3,  type: "minute", text: "3m"},
  "5m":  {span: 5,  type: "minute", text: "5m"},
  "15m": {span: 15, type: "minute", text: "15m"},
  "30m": {span: 30, type: "minute", text: "30m"},
  "1H":  {span: 1,  type: "hour",   text: "1H"},
  "2H":  {span: 2,  type: "hour",   text: "2H"},
  "4H":  {span: 4,  type: "hour",   text: "4H"},
  "6H":  {span: 6,  type: "hour",   text: "6H"},
  "12H": {span: 12, type: "hour",   text: "12H"},
  "1D":  {span: 1,  type: "day",    text: "1D"},
  "1W":  {span: 1,  type: "week",   text: "1W"},
  "1M":  {span: 1,  type: "month",  text: "1M"},
}

export function textToPeriod(text: string): Period {
  return PERIOD_MAP[text] || PERIOD_MAP["1H"]
}

interface Props {
  symbol?: string
  period?: string
  theme?: "dark" | "light"
  onReady?: (superchart: Superchart) => void
  onChart?: (chart: Chart) => void
  onSymbolChange?: (symbol: SymbolInfo) => void
  onPeriodChange?: (period: Period) => void
  onVisibleRangeChange?: (range: VisibleTimeRange) => void
  visibleRange?: VisibleTimeRange | null
}

export function SuperchartCanvas({
  symbol = "BINA_USDT_BTC",
  period = "1H",
  theme = "dark",
  visibleRange,
  onReady,
  onChart,
  onSymbolChange,
  onPeriodChange,
  onVisibleRangeChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const superchartRef = useRef<Superchart | null>(null)
  const mountedRef = useRef(false)

  // Track values set by chart callbacks to prevent echo loops
  const chartSetSymbol = useRef<string | null>(null)
  const chartSetPeriod = useRef<string | null>(null)
  const chartSetVisibleRange = useRef(false)

  // Refs for callbacks so they don't trigger effect re-runs
  const onSymbolChangeRef = useRef(onSymbolChange)
  onSymbolChangeRef.current = onSymbolChange
  const onPeriodChangeRef = useRef(onPeriodChange)
  onPeriodChangeRef.current = onPeriodChange
  const onVisibleRangeChangeRef = useRef(onVisibleRangeChange)
  onVisibleRangeChangeRef.current = onVisibleRangeChange

  // Init once on mount
  useEffect(() => {
    if (!containerRef.current || !TOKEN) return

    const datafeed = new CoinrayDatafeed(TOKEN)
    const dataLoader = createDataLoader(datafeed)

    const superchart = new Superchart({
      container: containerRef.current,
      symbol: {ticker: symbol, pricePrecision: 2, volumePrecision: 0},
      period: textToPeriod(period),
      dataLoader,
      theme,
      debug: false,
      onSymbolChange: (s) => {
        chartSetSymbol.current = s.ticker
        onSymbolChangeRef.current?.(s)
      },
      onPeriodChange: (p) => {
        chartSetPeriod.current = p.text
        onPeriodChangeRef.current?.(p)
      },
      onVisibleRangeChange: (r) => {
        // TODO: This should only be called once per changed value
        console.log("onVisibleRangeChange", r)
        chartSetVisibleRange.current = true
        onVisibleRangeChangeRef.current?.(r)
      },
    })

    superchartRef.current = superchart
    ;(window.parent as any).superchart = superchart
    onReady?.(superchart)

    // Poll until klinecharts instance is ready
    const id = setInterval(() => {
      const kc = superchart.getChart()
      if (kc) {
        clearInterval(id)
        onChart?.(kc)
      }
    }, 100)

    mountedRef.current = true

    return () => {
      mountedRef.current = false
      clearInterval(id)
      superchart.dispose()
      superchartRef.current = null
      datafeed.dispose()
    }
  }, [])

  // Sync symbol changes
  useEffect(() => {
    if (!mountedRef.current || !superchartRef.current) return
    if (chartSetSymbol.current === symbol) {
      chartSetSymbol.current = null
      return
    }
    superchartRef.current.setSymbol({ticker: symbol, pricePrecision: 2, volumePrecision: 0})
  }, [symbol])

  // Sync period changes
  useEffect(() => {
    if (!mountedRef.current || !superchartRef.current) return
    if (chartSetPeriod.current === period) {
      chartSetPeriod.current = null
      return
    }
    superchartRef.current.setPeriod(textToPeriod(period))
  }, [period])

  // Sync visible range changes
  useEffect(() => {
    if (!mountedRef.current || !superchartRef.current || !visibleRange) return
    if (chartSetVisibleRange.current) {
      chartSetVisibleRange.current = false
      return
    }
    superchartRef.current.setVisibleRange(visibleRange)
  }, [visibleRange])

  // Sync theme changes
  useEffect(() => {
    if (!mountedRef.current || !superchartRef.current) return
    superchartRef.current.setTheme(theme)
  }, [theme])

  if (!TOKEN) {
    return (
      <div style={{padding: 20, color: "#f44", fontFamily: "monospace"}}>
        Set VITE_COINRAY_TOKEN in .storybook/.env
      </div>
    )
  }

  return <div ref={containerRef} style={{width: "100%", height: "100vh"}} />
}
