import {useEffect, useRef, useState} from "react"
import {Superchart, createDataLoader} from "@superchart/index"
import type {Chart} from "@superchart/index"
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

export interface ContextMenuItem {
  text?: string
  icon?: string
  hotkey?: string
  onClick?: () => void
  type?: "item" | "separator"
}

export type OnContextMenu = (time: number, price: number) => ContextMenuItem[]

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
  onContextMenu?: OnContextMenu
}

export function SuperchartCanvas({
  symbol = "BINA_USDT_BTC",
  period = "1H",
  theme: themeProp = "dark",
  visibleRange,
  onReady,
  onChart,
  onSymbolChange,
  onPeriodChange,
  onVisibleRangeChange,
  onContextMenu,
}: Props) {
  const [theme, setTheme] = useState<"dark" | "light">(themeProp)
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
      onContextMenu,
      onSymbolChange: (s) => {
        chartSetSymbol.current = s.ticker
        onSymbolChangeRef.current?.(s)
      },
      onPeriodChange: (p) => {
        chartSetPeriod.current = p.text
        onPeriodChangeRef.current?.(p)
      },
      onVisibleRangeChange: () => {
        const range = superchart.getChart()?.getVisibleRangeTimestamps()
        if (!range) return
        const r = {from: range.from / 1000, to: range.to / 1000}
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

  // Sync theme prop from outside
  useEffect(() => {
    setTheme(themeProp)
  }, [themeProp])

  // Sync theme changes to superchart
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

  const isDark = theme === "dark"

  return (
    <div style={{width: "100%", height: "100vh", display: "flex", flexDirection: "column"}}>
      <div ref={containerRef} style={{width: "100%", flex: 1}} />
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        background: isDark ? "#1e1e1e" : "#f0f0f0",
        borderTop: `1px solid ${isDark ? "#333" : "#ccc"}`,
      }}>
        <span style={{fontSize: 12, color: isDark ? "#aaa" : "#555", fontFamily: "monospace"}}>
          Theme
        </span>
        {(["dark", "light"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTheme(t)}
            style={{
              padding: "3px 10px",
              fontSize: 12,
              fontFamily: "monospace",
              cursor: "pointer",
              border: `1px solid ${isDark ? "#555" : "#bbb"}`,
              borderRadius: 4,
              background: theme === t
                ? (isDark ? "#4a9eff" : "#0066cc")
                : (isDark ? "#2a2a2a" : "#e0e0e0"),
              color: theme === t ? "#fff" : (isDark ? "#ccc" : "#333"),
            }}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  )
}
