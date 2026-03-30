import {useCallback, useEffect, useRef, useState} from "react"
import type {Meta, StoryObj} from "@storybook/react"
import type {Chart, OverlayEvent} from "@superchart"
import {SuperchartCanvas} from "../helpers/SuperchartCanvas"
import {createTimeAlertLine, createTrendlineAlertLine, createTriggeredPriceAlert, removeAllTriggeredAlerts, removeOverlay} from "./overlays/alerts"
import {useCurrentPrice} from "../helpers/useCurrentPrice"

function formatAlertLabel(ts: number): string {
  const d = new Date(ts)
  const day = d.getUTCDate()
  const mon = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getUTCMonth()]
  const yr = String(d.getUTCFullYear()).slice(2)
  const hh = String(d.getUTCHours()).padStart(2, "0")
  const mm = String(d.getUTCMinutes()).padStart(2, "0")
  return `Trigger At ${day} ${mon} '${yr} ${hh}:${mm}`
}

interface TimeAlertArgs {
  lock: boolean
  color: string
  textColor: string
  textBackgroundColor: string
  textFontSize: number
  lineWidth: number
  lineStyle: "solid" | "dashed"
  symbol: string
}

function TimeAlertDemo({lock, color, textColor, textBackgroundColor, textFontSize, lineWidth, lineStyle, symbol}: TimeAlertArgs) {
  const [chart, setChart] = useState<Chart | null>(null)
  const [alertTs, setAlertTs] = useState<number>(() => Date.now() + 2 * 60 * 60 * 1000)
  const idsRef = useRef<string[]>([])

  const onChart = useCallback((c: Chart) => setChart(c), [])

  const clear = () => {
    if (!chart) return
    idsRef.current.forEach(id => removeOverlay(chart, id))
    idsRef.current = []
  }

  const handlePressedMoveEnd = useCallback((event: OverlayEvent<unknown>) => {
    const ts = event?.overlay?.points?.[0]?.timestamp
    if (ts) {
      console.log("[onPressedMoveEnd] new timestamp:", ts, new Date(ts).toISOString())
      setAlertTs(ts)
    }
  }, [])

  const handlePressedMoving = useCallback((event: OverlayEvent<unknown>) => {
    const ts = event?.overlay?.points?.[0]?.timestamp
    console.log("[onPressedMoving] timestamp:", ts)
  }, [])

  const handleSelected = useCallback((event: OverlayEvent<unknown>) => {
    console.log("[onSelected] overlay:", event?.overlay?.id)
  }, [])

  const handleDeselected = useCallback((event: OverlayEvent<unknown>) => {
    console.log("[onDeselected] overlay:", event?.overlay?.id)
  }, [])

  const handleClick = useCallback((event: OverlayEvent<unknown>) => {
    console.log("[onClick] overlay:", event?.overlay?.id)
  }, [])

  const handleRightClick = useCallback((event: OverlayEvent<unknown>) => {
    console.log("[onRightClick] overlay:", event?.overlay?.id)
  }, [])

  useEffect(() => {
    if (!chart) return
    clear()

    const text = formatAlertLabel(alertTs)

    const id = createTimeAlertLine(chart, alertTs, {
      color, lineWidth, lineStyle, lock,
      text, textColor, textBackgroundColor, textFontSize,
      onPressedMoveEnd: handlePressedMoveEnd,
      onPressedMoving: handlePressedMoving,
      onSelected: handleSelected,
      onDeselected: handleDeselected,
      onClick: handleClick,
      onRightClick: handleRightClick,
    })

    if (id) idsRef.current.push(id)
    return clear
  }, [chart, alertTs, lock, color, textColor, textBackgroundColor, textFontSize, lineWidth, lineStyle])

  return <SuperchartCanvas symbol={symbol} onChart={onChart} />
}

// --- Trendline Alert ---

interface TrendlineAlertArgs {
  lock: boolean
  color: string
  lineWidth: number
  lineStyle: "solid" | "dashed"
  text: string
  textColor: string
  textBackgroundColor: string
  textFontSize: number
  symbol: string
}

function TrendlineAlertDemo({lock, color, lineWidth, lineStyle, text, textColor, textBackgroundColor, textFontSize, symbol}: TrendlineAlertArgs) {
  const [chart, setChart] = useState<Chart | null>(null)
  const currentPrice = useCurrentPrice(chart)
  const [points, setPoints] = useState<[{timestamp: number, value: number}, {timestamp: number, value: number}] | null>(null)
  const idsRef = useRef<string[]>([])

  const onChart = useCallback((c: Chart) => setChart(c), [])

  const clear = () => {
    if (!chart) return
    idsRef.current.forEach(id => removeOverlay(chart, id))
    idsRef.current = []
  }

  // Set initial points once we have chart data
  useEffect(() => {
    if (!chart || !currentPrice || points) return
    const dataList = chart.getDataList()
    if (dataList.length < 40) return
    const len = dataList.length
    const bar1 = dataList[len - 40]
    const bar2 = dataList[len - 10]
    setPoints([
      {timestamp: bar1.timestamp, value: bar1.close},
      {timestamp: bar2.timestamp, value: bar2.close},
    ])
  }, [chart, currentPrice, points])

  const handlePressedMoveEnd = useCallback((event: OverlayEvent<unknown>) => {
    const pts = event?.overlay?.points
    if (pts && pts.length >= 2) {
      const p1 = {timestamp: pts[0].timestamp!, value: pts[0].value!}
      const p2 = {timestamp: pts[1].timestamp!, value: pts[1].value!}
      console.log("[onPressedMoveEnd] points:", p1, p2)
      setPoints([p1, p2])
    }
  }, [])

  const handlePressedMoving = useCallback((event: OverlayEvent<unknown>) => {
    const pts = event?.overlay?.points
    if (pts && pts.length >= 2) {
      console.log("[onPressedMoving] p1:", pts[0], "p2:", pts[1])
    }
  }, [])

  const handleSelected = useCallback((event: OverlayEvent<unknown>) => {
    console.log("[onSelected] overlay:", event?.overlay?.id)
  }, [])

  const handleDeselected = useCallback((event: OverlayEvent<unknown>) => {
    console.log("[onDeselected] overlay:", event?.overlay?.id)
  }, [])

  const handleClick = useCallback((event: OverlayEvent<unknown>) => {
    console.log("[onClick] overlay:", event?.overlay?.id)
  }, [])

  const handleRightClick = useCallback((event: OverlayEvent<unknown>) => {
    console.log("[onRightClick] overlay:", event?.overlay?.id)
  }, [])

  useEffect(() => {
    if (!chart || !points) return
    clear()

    const id = createTrendlineAlertLine(chart, points, {
      color, lineWidth, lineStyle, lock,
      text, textColor, textBackgroundColor, textFontSize,
      onPressedMoveEnd: handlePressedMoveEnd,
      onPressedMoving: handlePressedMoving,
      onSelected: handleSelected,
      onDeselected: handleDeselected,
      onClick: handleClick,
      onRightClick: handleRightClick,
    })

    if (id) idsRef.current.push(id)
    return clear
  }, [chart, points, lock, color, lineWidth, lineStyle, text, textColor, textBackgroundColor, textFontSize])

  return <SuperchartCanvas symbol={symbol} onChart={onChart} />
}

// --- Triggered Price Alert ---

interface TriggeredPriceAlertArgs {
  numAlerts: number
  spacingHours: number
  color: string
  symbol: string
}

function TriggeredPriceAlertDemo({numAlerts, spacingHours, color, symbol}: TriggeredPriceAlertArgs) {
  const [chart, setChart] = useState<Chart | null>(null)
  const idsRef = useRef<string[]>([])

  const onChart = useCallback((c: Chart) => setChart(c), [])

  useEffect(() => {
    if (!chart) return

    const create = (chart: Chart) => {
      const dataList = chart.getDataList()
      if (!dataList.length) return

      const nowMs = Date.now()
      for (let i = 0; i < numAlerts; i++) {
        const timeMs = nowMs - (i + 1) * spacingHours * 3600 * 1000
        let match = dataList[0]
        for (const bar of dataList) {
          if (bar.timestamp <= timeMs) match = bar
          else break
        }

        const price = i % 2 === 0 ? match.high : match.low
        const id = createTriggeredPriceAlert(chart, match.timestamp, price, {color})
        if (id) idsRef.current.push(id)
      }
    }

    removeAllTriggeredAlerts(chart)
    idsRef.current = []

    const dataList = chart.getDataList()
    if (dataList.length) {
      create(chart)
    } else {
      const timer = setTimeout(() => create(chart), 500)
      return () => clearTimeout(timer)
    }

    return () => {
      removeAllTriggeredAlerts(chart)
      idsRef.current = []
    }
  }, [chart, numAlerts, spacingHours, color])

  return <SuperchartCanvas symbol={symbol} onChart={onChart} />
}

// --- Meta ---

const meta: Meta = {
  title: "Overlays/Alerts",
}
export default meta

export const TimeAlert: StoryObj<typeof TimeAlertDemo> = {
  render: (args) => <TimeAlertDemo {...args} />,
  argTypes: {
    lock: {control: "boolean", table: {category: "Behavior"}},
    color: {control: "color", table: {category: "Line"}},
    textColor: {control: "color", table: {category: "Label"}},
    textBackgroundColor: {control: "color", table: {category: "Label"}},
    textFontSize: {control: {type: "number", min: 8, max: 24}, table: {category: "Label"}},
    lineWidth: {control: {type: "number", min: 1, max: 5}, table: {category: "Line"}},
    lineStyle: {control: "select", options: ["solid", "dashed"], table: {category: "Line"}},
    symbol: {control: "text", table: {category: "Chart"}},
  },
  args: {
    lock: false,
    color: "#3ea6ff",
    textColor: "#FFFFFF",
    textBackgroundColor: "#3ea6ff",
    textFontSize: 12,
    lineWidth: 1,
    lineStyle: "solid",
    symbol: "BINA_USDT_BTC",
  },
}

export const TrendlineAlert: StoryObj<typeof TrendlineAlertDemo> = {
  render: (args) => <TrendlineAlertDemo {...args} />,
  argTypes: {
    lock: {control: "boolean", table: {category: "Behavior"}},
    color: {control: "color", table: {category: "Line"}},
    lineWidth: {control: {type: "number", min: 1, max: 5}, table: {category: "Line"}},
    lineStyle: {control: "select", options: ["solid", "dashed"], table: {category: "Line"}},
    text: {control: "text", table: {category: "Label"}},
    textColor: {control: "color", table: {category: "Label"}},
    textBackgroundColor: {control: "color", table: {category: "Label"}},
    textFontSize: {control: {type: "number", min: 8, max: 24}, table: {category: "Label"}},
    symbol: {control: "text", table: {category: "Chart"}},
  },
  args: {
    lock: false,
    color: "#3ea6ff",
    lineWidth: 1,
    lineStyle: "solid",
    text: "Alert 🔔",
    textColor: "#FFFFFF",
    textBackgroundColor: "#3ea6ff",
    textFontSize: 12,
    symbol: "BINA_USDT_BTC",
  },
}

export const TriggeredPriceAlert: StoryObj<typeof TriggeredPriceAlertDemo> = {
  render: (args) => <TriggeredPriceAlertDemo {...args} />,
  argTypes: {
    numAlerts: {control: {type: "number", min: 1, max: 20, step: 1}, table: {category: "Demo Data"}},
    spacingHours: {control: {type: "number", min: 0.5, step: 0.5}, table: {category: "Demo Data"}},
    color: {control: "color", table: {category: "Colors"}},
    symbol: {control: "text", table: {category: "Chart"}},
  },
  args: {
    numAlerts: 4,
    spacingHours: 3,
    color: "#00BFFF",
    symbol: "BINA_USDT_BTC",
  },
}
