/**
 * Persistence story — exercises the StorageAdapter contract end-to-end.
 *
 * Toggle between LocalStorageAdapter (single device, no real conflicts) and
 * HttpStorageAdapter (talks to examples/server). The HUD shows the current
 * revision and any error surfaced via `onStorageError`.
 *
 * Conflict demo:
 *   1. Pick HttpStorageAdapter, draw an overlay on the chart.
 *   2. Open the same story in a second browser tab (same `storageKey`).
 *   3. Draw a different overlay in tab #2 — both saves succeed, the
 *      merge-retry loop replays the local mutation atop the remote state.
 *   4. Reload tab #1 to see both overlays present (array-merge by id).
 */
import {useCallback, useEffect, useMemo, useRef, useState} from "react"
import type {Meta, StoryObj} from "@storybook/react"
import {
  Superchart,
  createDataLoader,
  LocalStorageAdapter,
  HttpStorageAdapter,
  type StorageAdapter,
} from "@superchart/index"
import {CoinrayDatafeed} from "../helpers/CoinrayDatafeed"

const TOKEN = import.meta.env.VITE_COINRAY_TOKEN || ""
const SERVER_URL = "http://localhost:8080/chart-state"

type AdapterMode = "localStorage" | "http"

interface PersistenceArgs {
  symbol: string
  storageKey: string
  adapterMode: AdapterMode
}

function PersistenceDemo({symbol, storageKey, adapterMode}: PersistenceArgs) {
  const containerRef = useRef<HTMLDivElement>(null)
  const superchartRef = useRef<Superchart | null>(null)
  const adapterRef = useRef<StorageAdapter | null>(null)
  const [, setTick] = useState(0)
  const [lastError, setLastError] = useState<string | null>(null)
  const [revision, setRevision] = useState<number | null>(null)

  // (Re)build the adapter when the mode changes.
  const adapter = useMemo<StorageAdapter>(() => {
    return adapterMode === "localStorage"
      ? new LocalStorageAdapter()
      : new HttpStorageAdapter({baseUrl: SERVER_URL})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapterMode])

  adapterRef.current = adapter

  // Fetch current revision so the HUD reflects what's persisted.
  const refreshRevision = useCallback(async () => {
    try {
      const record = await adapterRef.current?.load(storageKey)
      setRevision(record?.revision ?? null)
    } catch (err) {
      setLastError((err as Error).message)
    }
  }, [storageKey])

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
      storageAdapter: adapter,
      storageKey,
      drawingBarVisible: true,
      onStorageError: (err) => {
        setLastError(err.message)
      },
    })

    superchartRef.current = superchart

    // Poll for revision changes — cheap because both adapters cache locally.
    const id = setInterval(() => {
      refreshRevision()
      setTick((t) => t + 1)
    }, 1000)

    return () => {
      clearInterval(id)
      superchart.dispose()
      datafeed.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter, storageKey, symbol])

  const handleClear = async () => {
    try {
      await adapterRef.current?.delete(storageKey)
      setLastError(null)
      await refreshRevision()
      // Force a remount of the chart so the cleared state is reflected
      window.location.reload()
    } catch (err) {
      setLastError((err as Error).message)
    }
  }

  if (!TOKEN) {
    return (
      <div style={{padding: 20, color: "#f44", fontFamily: "monospace"}}>
        Set VITE_COINRAY_TOKEN in .storybook/.env
      </div>
    )
  }

  return (
    <div style={{position: "relative", width: "100%", height: "100vh"}}>
      <div ref={containerRef} style={{width: "100%", height: "100%"}}/>
      <div style={{
        position: "absolute", top: 16, right: 16, zIndex: 9999,
        background: "rgba(20, 20, 35, 0.92)", color: "#ccc",
        padding: "12px 14px", borderRadius: 6,
        fontFamily: "monospace", fontSize: 12, lineHeight: 1.7,
        minWidth: 280,
        border: "1px solid #333",
      }}>
        <div style={{fontWeight: "bold", color: "#fff", marginBottom: 6}}>
          Persistence
        </div>
        <div>Adapter: <span style={{color: "#fff"}}>{adapterMode}</span></div>
        <div>Storage key: <span style={{color: "#fff"}}>{storageKey}</span></div>
        <div>Revision: <span style={{color: "#7af"}}>{revision ?? "—"}</span></div>
        {lastError && (
          <div style={{color: "#f88", marginTop: 6}}>Last error: {lastError}</div>
        )}
        <div style={{marginTop: 8}}>
          <button
            onClick={handleClear}
            style={{
              padding: "4px 10px", fontSize: 12, fontFamily: "monospace",
              background: "#2a2a3a", color: "#fff", border: "1px solid #555",
              borderRadius: 3, cursor: "pointer",
            }}
          >
            Clear & reload
          </button>
        </div>
        <div style={{marginTop: 8, fontSize: 11, color: "#888"}}>
          Draw overlays to trigger saves. Reload to verify they restore.
        </div>
      </div>
    </div>
  )
}

const meta: Meta<typeof PersistenceDemo> = {
  title: "API/Persistence",
  component: PersistenceDemo,
  argTypes: {
    adapterMode: {
      control: "select",
      options: ["localStorage", "http"],
      table: {category: "Adapter"},
      description: "Pick a bundled adapter implementation. `http` requires examples/server running on :8080.",
    },
    storageKey: {control: "text", table: {category: "Adapter"}},
    symbol: {control: "text", table: {category: "Chart"}},
  },
}
export default meta

type Story = StoryObj<typeof PersistenceDemo>

export const LocalStorage: Story = {
  args: {
    symbol: "BINA_USDT_BTC",
    storageKey: "demo:btc-1h",
    adapterMode: "localStorage",
  },
}

export const HttpServer: Story = {
  args: {
    symbol: "BINA_USDT_BTC",
    storageKey: "demo:btc-1h",
    adapterMode: "http",
  },
}
