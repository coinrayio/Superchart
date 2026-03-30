import {useCallback, useEffect, useState} from "react"
import type {Meta, StoryObj} from "@storybook/react"
import {SuperchartCanvas} from "../helpers/SuperchartCanvas"
import type {Period, SymbolInfo, VisibleTimeRange} from "@superchart/index"

const PERIOD_OPTIONS = ["1m", "3m", "5m", "15m", "30m", "1H", "2H", "4H", "6H", "12H", "1D", "1W", "1M"]

interface SyncArgs {
  symbol: string
  period: string
  theme: "dark" | "light"
}

const panelStyle: React.CSSProperties = {
  position: "absolute", top: 48, right: 12, zIndex: 10,
  background: "rgba(0,0,0,0.85)", color: "#eee", padding: "10px 14px",
  borderRadius: 6, fontFamily: "monospace", fontSize: 12, lineHeight: 2,
  pointerEvents: "auto",
}

const selectStyle: React.CSSProperties = {
  background: "#333", color: "#eee", border: "1px solid #555",
  borderRadius: 3, padding: "2px 4px", fontFamily: "monospace", fontSize: 12,
  marginLeft: 6, cursor: "pointer",
}

const inputStyle: React.CSSProperties = {
  ...selectStyle, width: 160,
}

const rangeInputStyle: React.CSSProperties = {
  ...selectStyle, width: 80,
}

function SyncDemo({symbol: initialSymbol, period: initialPeriod, theme}: SyncArgs) {
  const [symbol, setSymbol] = useState(initialSymbol)
  const [period, setPeriod] = useState(initialPeriod)
  const [visibleRange, setVisibleRange] = useState<VisibleTimeRange | null>(null)

  // Sync from Storybook controls when they change
  useEffect(() => { setSymbol(initialSymbol) }, [initialSymbol])
  useEffect(() => { setPeriod(initialPeriod) }, [initialPeriod])

  // Chart -> state
  const handleSymbolChange = useCallback((s: SymbolInfo) => {
    setSymbol(s.ticker)
  }, [])

  const handlePeriodChange = useCallback((p: Period) => {
    setPeriod(p.text)
  }, [])

  const handleVisibleRangeChange = useCallback((range: VisibleTimeRange) => {
    // TODO: This should only be called once per changed value
    console.log("handleVisibleRangeChange", range)
    setVisibleRange(range)
  }, [])

  const fmtTime = (ts: number) => new Date(ts * 1000).toISOString().slice(0, 19).replace("T", " ")

  return (
    <div style={{position: "relative", width: "100%", height: "100vh"}}>
      <div style={panelStyle}>
        <div>
          symbol:
          <input
            style={inputStyle}
            value={symbol}
            onChange={e => setSymbol(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") setSymbol((e.target as HTMLInputElement).value) }}
          />
        </div>
        <div>
          period:
          <select style={selectStyle} value={period} onChange={e => setPeriod(e.target.value)}>
            {PERIOD_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          range:
          <input
            style={rangeInputStyle}
            value={visibleRange?.from ?? ""}
            onChange={e => setVisibleRange(r => r ? {...r, from: Number(e.target.value)} : {from: Number(e.target.value), to: 0})}
          />
          {" — "}
          <input
            style={rangeInputStyle}
            value={visibleRange?.to ?? ""}
            onChange={e => setVisibleRange(r => r ? {...r, to: Number(e.target.value)} : {from: 0, to: Number(e.target.value)})}
          />
          {visibleRange && (
            <div style={{color: "#888", fontSize: 11}}>
              {fmtTime(visibleRange.from)} — {fmtTime(visibleRange.to)}
            </div>
          )}
        </div>
      </div>
      <SuperchartCanvas
        symbol={symbol}
        period={period}
        theme={theme}
        visibleRange={visibleRange}
        onSymbolChange={handleSymbolChange}
        onPeriodChange={handlePeriodChange}
        onVisibleRangeChange={handleVisibleRangeChange}
      />
    </div>
  )
}

const meta: Meta<typeof SyncDemo> = {
  title: "API/Sync",
  component: SyncDemo,
  argTypes: {
    symbol: {control: "text", table: {category: "Initial"}},
    period: {control: "select", options: PERIOD_OPTIONS, table: {category: "Initial"}},
    theme: {control: "select", options: ["dark", "light"], table: {category: "Chart"}},
  },
}
export default meta

type Story = StoryObj<typeof SyncDemo>

export const Default: Story = {
  args: {
    symbol: "BINA_USDT_BTC",
    period: "1H",
    theme: "dark",
  },
}
