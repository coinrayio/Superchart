import {useMemo} from "react"
import type {Meta, StoryObj} from "@storybook/react"
import {SuperchartCanvas} from "../helpers/SuperchartCanvas"

// The 8 data-button ids rendered by the period bar.
const BUTTON_IDS = [
  "leftToolbarToggle",
  "symbolSearch",
  "periodPicker",
  "indicators",
  "timezone",
  "settings",
  "screenshot",
  "fullscreen",
] as const
type ButtonId = typeof BUTTON_IDS[number]

type PerButtonFlags = { [K in ButtonId as `${K}Visible` | `${K}Enabled`]: boolean }

interface Args extends PerButtonFlags {
  symbol: string
  period: string
  theme: "dark" | "light"
  periodBarVisible: boolean
}

function buildCss(flags: PerButtonFlags): string {
  const rules: string[] = []
  for (const id of BUTTON_IDS) {
    if (!flags[`${id}Visible` as keyof PerButtonFlags]) {
      rules.push(`.superchart-period-bar [data-button="${id}"] { display: none }`)
    } else if (!flags[`${id}Enabled` as keyof PerButtonFlags]) {
      rules.push(`.superchart-period-bar [data-button="${id}"] { opacity: 0.4; pointer-events: none }`)
    }
  }
  return rules.join("\n")
}

function PeriodBarVisibilityDemo(args: Args) {
  const {symbol, period, theme, periodBarVisible, ...flags} = args
  const css = useMemo(() => buildCss(flags), [flags])

  return (
    <SuperchartCanvas
      symbol={symbol}
      period={period}
      theme={theme}
      periodBarVisible={periodBarVisible}
      extraCss={css}
    />
  )
}

const perButtonArgTypes = BUTTON_IDS.reduce<Record<string, object>>((acc, id) => {
  acc[`${id}Visible`] = {control: "boolean", table: {category: `Button: ${id}`}}
  acc[`${id}Enabled`] = {control: "boolean", table: {category: `Button: ${id}`}}
  return acc
}, {})

const perButtonDefaults = BUTTON_IDS.reduce<Record<string, boolean>>((acc, id) => {
  acc[`${id}Visible`] = true
  acc[`${id}Enabled`] = true
  return acc
}, {})

const meta: Meta<typeof PeriodBarVisibilityDemo> = {
  title: "API/PeriodBarVisibility",
  component: PeriodBarVisibilityDemo,
  argTypes: {
    symbol: {control: "text", table: {category: "Chart"}},
    period: {control: "select", options: ["1m", "5m", "15m", "1H", "4H", "1D"], table: {category: "Chart"}},
    theme: {control: "select", options: ["dark", "light"], table: {category: "Chart"}},
    periodBarVisible: {control: "boolean", table: {category: "Period Bar"}},
    ...perButtonArgTypes,
  },
}
export default meta

type Story = StoryObj<typeof PeriodBarVisibilityDemo>

export const Default: Story = {
  args: {
    symbol: "BINA_USDT_BTC",
    period: "1H",
    theme: "dark",
    periodBarVisible: true,
    ...perButtonDefaults,
  } as Args,
}
