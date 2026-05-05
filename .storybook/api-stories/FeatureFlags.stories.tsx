/**
 * FeatureFlags story — exercises every flag in the FeatureFlag union.
 *
 * Each control toggles a flag at runtime via `superchart.setFeatureEnabled`.
 * Most flags target UI that's already wired (drawing_bar, period_bar,
 * right_click_menu); the rest are reserved for upcoming tickets and toggle
 * cleanly even though their UIs aren't built yet.
 */
import {useEffect, useRef} from "react"
import type {Meta, StoryObj} from "@storybook/react"
import {Superchart, createDataLoader, type FeatureFlag, FEATURE_DEFAULTS} from "@superchart/index"
import {CoinrayDatafeed} from "../helpers/CoinrayDatafeed"

const TOKEN = import.meta.env.VITE_COINRAY_TOKEN || ""

const ALL_FLAGS = Object.keys(FEATURE_DEFAULTS) as FeatureFlag[]

// Building the argTypes object dynamically so storybook surfaces every
// flag as a boolean toggle. Categorising in the UI makes the long list
// easier to scan.
const FLAG_CATEGORY: Record<FeatureFlag, string> = {
  drawing_bar: "Toolbars / chrome",
  period_bar: "Toolbars / chrome",
  screenshot_button: "Toolbars / chrome",
  fullscreen_button: "Toolbars / chrome",
  settings_button: "Toolbars / chrome",
  timezone_button: "Toolbars / chrome",
  symbol_search: "Toolbars / chrome",
  period_picker: "Toolbars / chrome",
  indicator_picker: "Toolbars / chrome",
  right_click_menu: "Interaction",
  longpress_menu: "Interaction",
  crosshair_magnet: "Interaction",
  auto_save_state: "Persistence",
  study_templates: "Templates (future)",
  drawing_templates: "Templates (future)",
  chart_templates: "Templates (future)",
  multi_chart_browser: "Templates (future)",
  volume_in_legend: "Chart visuals",
  last_close_price_line: "Chart visuals",
}

interface FeatureFlagsArgs extends Record<FeatureFlag, boolean> {
  symbol: string
  autoSaveDelay: number
}

function FeatureFlagsDemo(args: FeatureFlagsArgs) {
  const containerRef = useRef<HTMLDivElement>(null)
  const superchartRef = useRef<Superchart | null>(null)

  // Init once on mount with the initial flag values; later flag toggles flow
  // through setFeatureEnabled so we don't recreate the chart on every change.
  useEffect(() => {
    if (!containerRef.current || !TOKEN) return

    const datafeed = new CoinrayDatafeed(TOKEN)
    const dataLoader = createDataLoader(datafeed)

    const enabledFeatures: FeatureFlag[] = []
    const disabledFeatures: FeatureFlag[] = []
    for (const flag of ALL_FLAGS) {
      if (args[flag] !== FEATURE_DEFAULTS[flag]) {
        ;(args[flag] ? enabledFeatures : disabledFeatures).push(flag)
      }
    }

    const superchart = new Superchart({
      container: containerRef.current,
      symbol: {ticker: args.symbol, pricePrecision: 2, volumePrecision: 0},
      period: {type: "hour", span: 1, text: "1H"},
      dataLoader,
      theme: "dark",
      debug: false,
      enabledFeatures,
      disabledFeatures,
      autoSaveDelay: args.autoSaveDelay,
    })

    superchartRef.current = superchart
    return () => {
      superchart.dispose()
      datafeed.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [args.symbol])

  // Sync runtime toggles to the live instance — demonstrates that flag
  // changes don't require a remount.
  useEffect(() => {
    const sc = superchartRef.current
    if (!sc) return
    for (const flag of ALL_FLAGS) {
      sc.setFeatureEnabled(flag, args[flag])
    }
  }, ALL_FLAGS.map(f => args[f]))  // eslint-disable-line react-hooks/exhaustive-deps

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
        position: "absolute", bottom: 16, left: 16, zIndex: 9999,
        background: "rgba(20, 20, 35, 0.92)", color: "#ccc",
        padding: "10px 14px", borderRadius: 6,
        fontFamily: "monospace", fontSize: 11, lineHeight: 1.6,
        maxWidth: 480, border: "1px solid #333",
      }}>
        <div style={{fontWeight: "bold", color: "#fff", marginBottom: 4}}>
          Feature flags ({ALL_FLAGS.filter(f => args[f]).length}/{ALL_FLAGS.length} enabled)
        </div>
        <div style={{color: "#888"}}>
          Toggle controls in the storybook side panel. Most fire the
          existing wired widgets (drawing/period bars, right-click menu,
          auto-save). Templates & browser flags reserved for upcoming
          tickets.
        </div>
      </div>
    </div>
  )
}

const argTypes: Record<string, unknown> = {
  symbol: {control: "text", table: {category: "Chart"}},
  autoSaveDelay: {
    control: {type: "number", min: 0, step: 100},
    table: {category: "Persistence"},
    description: "Debounce ms for auto-save. 0 = save on every mutation; >0 = collapse rapid edits.",
  },
}
for (const flag of ALL_FLAGS) {
  argTypes[flag] = {
    control: "boolean",
    table: {category: FLAG_CATEGORY[flag]},
  }
}

const args: FeatureFlagsArgs = {
  symbol: "BINA_USDT_BTC",
  autoSaveDelay: 0,
  ...FEATURE_DEFAULTS,
}

const meta: Meta<typeof FeatureFlagsDemo> = {
  title: "API/FeatureFlags",
  component: FeatureFlagsDemo,
  argTypes,
}
export default meta

type Story = StoryObj<typeof FeatureFlagsDemo>

export const Default: Story = {
  args,
}
