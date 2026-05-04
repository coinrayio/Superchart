import {useCallback, useEffect, useRef, useState} from "react"
import type {Meta, StoryObj} from "@storybook/react"
import {SuperchartCanvas} from "../helpers/SuperchartCanvas"
import {isSetVisibleRangeError} from "@superchart/index"
import type {Period, Superchart, SymbolInfo, VisibleTimeRange} from "@superchart/index"

const PERIOD_OPTIONS = ["1m", "3m", "5m", "15m", "30m", "1H", "2H", "4H", "6H", "12H", "1D", "1W", "1M"]

const WINDOW_OPTIONS: Array<{label: string; seconds: number}> = [
  {label: "1H",  seconds: 60 * 60},
  {label: "4H",  seconds: 4 * 60 * 60},
  {label: "1D",  seconds: 24 * 60 * 60},
  {label: "3D",  seconds: 3 * 24 * 60 * 60},
  {label: "1W",  seconds: 7 * 24 * 60 * 60},
  {label: "1M",  seconds: 30 * 24 * 60 * 60},
]

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

const buttonStyle: React.CSSProperties = {
  ...selectStyle, padding: "3px 10px", marginLeft: 8,
}

function toLocalInputValue(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function SyncDemo({symbol: initialSymbol, period: initialPeriod, theme}: SyncArgs) {
  const [symbol, setSymbol] = useState(initialSymbol)
  const [period, setPeriod] = useState(initialPeriod)
  const [visibleRange, setVisibleRange] = useState<VisibleTimeRange | null>(null)
  const [target, setTarget] = useState(() => toLocalInputValue(Date.now() - 30 * 24 * 60 * 60 * 1000))
  const [windowSec, setWindowSec] = useState(WINDOW_OPTIONS[2].seconds)
  const [pending, setPending] = useState(false)
  const [lastApplied, setLastApplied] = useState<VisibleTimeRange | null>(null)
  const [error, setError] = useState<string | null>(null)
  const superchartRef = useRef<Superchart | null>(null)

  // Sync from Storybook controls when they change
  useEffect(() => { setSymbol(initialSymbol) }, [initialSymbol])
  useEffect(() => { setPeriod(initialPeriod) }, [initialPeriod])

  const handleReady = useCallback((sc: Superchart) => { superchartRef.current = sc }, [])

  // Chart -> state
  const handleSymbolChange = useCallback((s: SymbolInfo) => {
    setSymbol(s.ticker)
  }, [])

  const handlePeriodChange = useCallback((p: Period) => {
    setPeriod(p.text)
  }, [])

  const handleVisibleRangeChange = useCallback((range: VisibleTimeRange) => {
    setVisibleRange(range)
  }, [])

  const handleJump = useCallback(async () => {
    const sc = superchartRef.current
    if (!sc) return
    const targetMs = new Date(target).getTime()
    if (Number.isNaN(targetMs)) return
    const targetSec = Math.floor(targetMs / 1000)
    const range: VisibleTimeRange = {
      from: targetSec - Math.floor(windowSec / 2),
      to: targetSec + Math.floor(windowSec / 2),
    }
    setPending(true)
    setError(null)
    try {
      await sc.setVisibleRange(range)
      setLastApplied(range)
    } catch (e) {
      if (isSetVisibleRangeError(e) && e.code === "no_data_at_time") {
        const detail = e.detail as {firstCandleTime?: number} | undefined
        const earliest = detail?.firstCandleTime ? fmtTime(Math.floor(detail.firstCandleTime / 1000)) : "?"
        setError(`no data at this time — earliest candle for this resolution is ${earliest}`)
      } else {
        setError(e instanceof Error ? e.message : String(e))
      }
    } finally {
      setPending(false)
    }
  }, [target, windowSec])

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
        <div>
          jump to:
          <input
            style={inputStyle}
            type="datetime-local"
            value={target}
            onChange={e => setTarget(e.target.value)}
          />
        </div>
        <div>
          window:
          <select style={selectStyle} value={windowSec} onChange={e => setWindowSec(Number(e.target.value))}>
            {WINDOW_OPTIONS.map(w => <option key={w.label} value={w.seconds}>{w.label}</option>)}
          </select>
          <button style={buttonStyle} onClick={handleJump} disabled={pending}>
            {pending ? "fetching…" : "jump"}
          </button>
        </div>
        {lastApplied && (
          <div style={{color: "#888", fontSize: 11}}>
            applied: {fmtTime(lastApplied.from)} — {fmtTime(lastApplied.to)}
          </div>
        )}
        {error && (
          <div style={{color: "#f66", fontSize: 11}}>
            error: {error}
          </div>
        )}
      </div>
      <SuperchartCanvas
        symbol={symbol}
        period={period}
        theme={theme}
        visibleRange={visibleRange}
        onReady={handleReady}
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
