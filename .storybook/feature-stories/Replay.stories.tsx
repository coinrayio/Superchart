import {useCallback, useEffect, useRef, useState} from "react"
import type {Meta, StoryObj} from "@storybook/react"
import {SuperchartCanvas} from "../helpers/SuperchartCanvas"
import type {Superchart} from "@superchart/index"
import {ReplayController} from "./replay/ReplayController"
import type {ReplayStatus} from "./replay/ReplayController"

interface ReplayArgs {
  symbol: string
  period: string
  theme: "dark" | "light"
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const panelStyle: React.CSSProperties = {
  position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10,
  background: "rgba(0,0,0,0.85)", color: "#eee", padding: "6px 12px",
  fontFamily: "monospace", fontSize: 12,
  display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
  pointerEvents: "auto",
}

const btnStyle: React.CSSProperties = {
  background: "#2a2a2a", color: "#eee", borderWidth: 1, borderStyle: "solid", borderColor: "#555",
  borderRadius: 4, padding: "4px 12px", fontFamily: "monospace", fontSize: 12,
  cursor: "pointer",
}

const btnActiveStyle: React.CSSProperties = {
  ...btnStyle, background: "#4a9eff", color: "#fff", borderColor: "#4a9eff",
}

const btnDangerStyle: React.CSSProperties = {
  ...btnStyle, background: "#c44", borderColor: "#c44", color: "#fff",
}

const inputStyle: React.CSSProperties = {
  background: "#333", color: "#eee", border: "1px solid #555",
  borderRadius: 3, padding: "4px 6px", fontFamily: "monospace", fontSize: 12,
  width: 170,
}

const selectStyle: React.CSSProperties = {
  ...inputStyle, width: "auto", cursor: "pointer",
}

const labelStyle: React.CSSProperties = {
  color: "#888", fontSize: 11,
}

const dividerStyle: React.CSSProperties = {
  width: 1, height: 16, background: "#555",
}

const statusColors: Record<ReplayStatus, {bg: string; color: string; border: string}> = {
  idle:     {bg: "#333",    color: "#888", border: "#555"},
  loading:  {bg: "#3a3a5a", color: "#aaf", border: "#66f"},
  ready:    {bg: "#2a3a5a", color: "#8af", border: "#4af"},
  playing:  {bg: "#2a5a2a", color: "#8f8", border: "#4a4"},
  paused:   {bg: "#5a4a1a", color: "#fc8", border: "#a84"},
  finished: {bg: "#5a2a2a", color: "#f88", border: "#a44"},
}

const statusLabels: Record<ReplayStatus, string> = {
  idle:     "LIVE",
  loading:  "LOADING",
  ready:    "READY",
  playing:  "PLAYING",
  paused:   "PAUSED",
  finished: "FINISHED",
}

function StatusBadge({status}: {status: ReplayStatus}) {
  const c = statusColors[status]
  return (
    <span style={{
      padding: "2px 8px", borderRadius: 3, fontSize: 11,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      minWidth: 64, textAlign: "center",
    }}>
      {statusLabels[status]}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SPEED_OPTIONS = [1, 2, 5, 10, 20, 100, 200, 400]

// Snapshot of controller state used for rendering
interface ControllerSnapshot {
  status: ReplayStatus
  stepsDrawn: number
  currentTime: number | null
  speed: number
  cps: number
  bufferRemaining: number
  lastError: string | null
}

function ReplayDemo({symbol, period, theme}: ReplayArgs) {
  const controllerRef = useRef(new ReplayController())

  const [snapshot, setSnapshot] = useState<ControllerSnapshot>(() => ({
    status: "idle",
    stepsDrawn: 0,
    currentTime: null,
    speed: 20,
    cps: 0,
    bufferRemaining: 0,
    lastError: null,
  }))

  const [startDate, setStartDate] = useState("2026-04-08T15:12")

  // Wire onChange once
  useEffect(() => {
    const ctrl = controllerRef.current!
    ctrl.onChange = () => {
      setSnapshot({
        status: ctrl.status,
        stepsDrawn: ctrl.stepsDrawn,
        currentTime: ctrl.currentTime,
        speed: ctrl.speed,
        cps: ctrl.cps,
        bufferRemaining: ctrl.bufferRemaining,
        lastError: ctrl.lastError,
      })
    }
    return () => {
      ctrl.dispose()
    }
  }, [])

  const onReady = useCallback((sc: Superchart) => {
    controllerRef.current?.setSuperchart(sc)
    window['replay'] = controllerRef.current
    if (window.parent) window.parent['replay'] = controllerRef.current
    if (window.top) window.top['replay'] = controllerRef.current
  }, [])

  const {status, stepsDrawn, currentTime, speed, cps, bufferRemaining, lastError} = snapshot
  const isActive = status !== "idle"
  const isPlaying = status === "playing"

  const handleStart = () => { void controllerRef.current?.start(new Date(startDate).getTime()) }
  const handleStep = () => controllerRef.current?.step()
  const handleStepBack = () => controllerRef.current?.stepBack()
  const handlePlay = () => controllerRef.current?.play()
  const handlePause = () => controllerRef.current?.pause()
  const handleRestart = () => { void controllerRef.current?.restart() }
  const handleStop = () => controllerRef.current?.stop()
  const handlePlayPause = () => {
    const ctrl = controllerRef.current
    if (!ctrl) return
    if (ctrl.status === "playing") ctrl.pause()
    else ctrl.play()
  }
  const handleSpeed = (e: React.ChangeEvent<HTMLSelectElement>) =>
    controllerRef.current?.setSpeed(Number(e.target.value))

  // Hotkeys
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.shiftKey) return
      const ctrl = controllerRef.current
      if (!ctrl || ctrl.status === "idle") return

      switch (e.key) {
        case "ArrowDown":  e.preventDefault(); handlePlayPause(); break
        case "ArrowRight": e.preventDefault(); ctrl.step(); break
        case "ArrowLeft":  e.preventDefault(); ctrl.stepBack(); break
        case "R": case "r": e.preventDefault(); void ctrl.restart(); break
        case "Q": case "q": e.preventDefault(); ctrl.stop(); break
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <div style={{position: "relative", width: "100%", height: "100vh"}}>
      <div style={panelStyle}>
        <StatusBadge status={status} />

        {isActive && (
          <span style={labelStyle}>{stepsDrawn} drawn</span>
        )}

        <div style={dividerStyle} />

        <input
          type="datetime-local"
          style={inputStyle}
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
        />

        <button style={btnActiveStyle} onClick={handleStart} title={isActive ? "Jump to selected date" : "Start replay"}>
          {isActive ? "Jump" : "Start"}
        </button>

        {/* Session controls — shown when active */}
        {isActive && (
          <>
            <div style={dividerStyle} />
            <button style={btnStyle} onClick={handleStepBack} title="Step back">
              ⏮
            </button>
            <button style={btnStyle} onClick={handleStep} title="Step forward">
              ⏭
            </button>
            {isPlaying ? (
              <button style={btnActiveStyle} onClick={handlePause} title="Pause">
                ⏸
              </button>
            ) : (
              <button style={btnStyle} onClick={handlePlay} title="Play">
                ▶
              </button>
            )}
            <button style={btnStyle} onClick={handleRestart} title="Restart">
              ⏮⏮
            </button>
            <button style={btnDangerStyle} onClick={handleStop} title="Stop">
              ⏹
            </button>

            <div style={dividerStyle} />

            {/* Speed control */}
            <span style={labelStyle}>Speed</span>
            <select
              style={selectStyle}
              value={speed}
              onChange={handleSpeed}
            >
              {SPEED_OPTIONS.map(s => (
                <option key={s} value={s}>{s}x</option>
              ))}
            </select>
            {isPlaying && (
              <span style={{...labelStyle, color: "#8f8"}}>{cps} cps · {bufferRemaining} left</span>
            )}
          </>
        )}

        {/* Current replay time */}
        {currentTime !== null && (
          <>
            <div style={dividerStyle} />
            <span style={labelStyle}>
              {new Date(currentTime).toLocaleString()}
            </span>
          </>
        )}

        {/* Error message */}
        {lastError !== null && (
          <>
            <div style={dividerStyle} />
            <span style={{
              color: "#f88", fontSize: 11, fontFamily: "monospace",
              padding: "2px 8px", background: "#5a2a2a", borderRadius: 3,
              borderWidth: 1, borderStyle: "solid", borderColor: "#a44",
            }}>
              {lastError}
            </span>
          </>
        )}
      </div>

      <SuperchartCanvas
        symbol={symbol}
        period={period}
        theme={theme}
        onReady={onReady}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Story metadata
// ---------------------------------------------------------------------------

const meta: Meta<typeof ReplayDemo> = {
  title: "Features/Replay",
  component: ReplayDemo,
  argTypes: {
    symbol: {control: "text",   table: {category: "Chart"}},
    period: {control: "select", options: ["1m", "5m", "15m", "1H", "4H", "1D"], table: {category: "Chart"}},
    theme:  {control: "select", options: ["dark", "light"],                      table: {category: "Chart"}},
  },
}
export default meta

type Story = StoryObj<typeof ReplayDemo>

export const Default: Story = {
  args: {
    symbol: "BINA_USDT_BTC",
    period: "1h",
    theme:  "dark",
  },
}
