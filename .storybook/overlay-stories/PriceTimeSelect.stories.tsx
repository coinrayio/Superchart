import {useCallback, useEffect, useRef, useState} from "react"
import type {Meta, StoryObj} from "@storybook/react"
import type {Superchart} from "@superchart/index"
import {SuperchartCanvas} from "../helpers/SuperchartCanvas"
import {startPriceTimeSelect, PriceTimeResult} from "./overlays/price-time-select"

interface PriceTimeSelectArgs {
  symbol: string
}

function PriceTimeSelectDemo({symbol}: PriceTimeSelectArgs) {
  const superchartRef = useRef<Superchart | null>(null)
  const hoverRef = useRef<PriceTimeResult | null>(null)
  const [hover, setHover] = useState<PriceTimeResult | null>(null)
  const [selected, setSelected] = useState<PriceTimeResult | null>(null)
  const [rightSelected, setRightSelected] = useState<PriceTimeResult | null>(null)
  const [doubleSelected, setDoubleSelected] = useState<PriceTimeResult | null>(null)
  const [count, setCount] = useState(0)
  const [rightCount, setRightCount] = useState(0)
  const [doubleCount, setDoubleCount] = useState(0)

  const onReady = useCallback((sc: Superchart) => {
    superchartRef.current = sc
  }, [])

  // Flush hover ref to state at 10fps to avoid re-render storm
  useEffect(() => {
    const id = setInterval(() => {
      setHover(hoverRef.current)
    }, 100)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const sc = superchartRef.current
    if (!sc) return

    const cleanup = startPriceTimeSelect(sc, {
      onCrosshairMoved: (result) => {
        hoverRef.current = result
      },
      onSelect: (result) => {
        setSelected(result)
        setCount((c) => c + 1)
      },
      onRightSelect: (result) => {
        setRightSelected(result)
        setRightCount((c) => c + 1)
      },
      onDoubleSelect: (result) => {
        setDoubleSelected(result)
        setDoubleCount((c) => c + 1)
      },
    })

    return cleanup
  }, [])

  const fmt = (r: PriceTimeResult | null, dim: boolean) => {
    const color = r ? (dim ? "#999" : "#fff") : "#555"
    return (
      <>
        <span style={{color}}>{r ? r.point.price.toFixed(2) : "null"}</span>
        {" / "}
        <span style={{color}}>{r ? new Date(r.point.time * 1000).toLocaleString() : "null"}</span>
        {r && <span style={{color: "#666"}}>{` canvas(${r.coordinate.x.toFixed(0)}, ${r.coordinate.y.toFixed(0)}) page(${r.coordinate.pageX.toFixed(0)}, ${r.coordinate.pageY.toFixed(0)})`}</span>}
      </>
    )
  }

  return (
    <div style={{position: "relative", width: "100%", height: "100vh"}}>
      <SuperchartCanvas symbol={symbol} onReady={onReady} />
      <div style={{
        position: "absolute", bottom: 16, left: 16, zIndex: 9999,
        background: "rgba(20, 20, 35, 0.85)", color: "#ccc",
        padding: "10px 14px", borderRadius: 6,
        fontFamily: "monospace", fontSize: 13, lineHeight: 1.6,
        pointerEvents: "none",
      }}>
        <div>Crosshair: {fmt(hover, true)}</div>
        <div>Selected: {fmt(selected, false)}</div>
        <div>Right-Selected: {fmt(rightSelected, false)}</div>
        <div>Double-Selected: {fmt(doubleSelected, false)}</div>
        <div>Clicks: <span style={{color: "#fff"}}>{count}</span> / Right-Clicks: <span style={{color: "#fff"}}>{rightCount}</span> / Double-Clicks: <span style={{color: "#fff"}}>{doubleCount}</span></div>
      </div>
    </div>
  )
}

const meta: Meta<typeof PriceTimeSelectDemo> = {
  title: "API/PriceTimeSelect",
  component: PriceTimeSelectDemo,
  argTypes: {
    symbol: {control: "text", table: {category: "Chart"}},
  },
}
export default meta

type Story = StoryObj<typeof PriceTimeSelectDemo>

export const Default: Story = {
  args: {
    symbol: "BINA_USDT_BTC",
  },
}
