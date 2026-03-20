import {useCallback} from "react"
import type {Meta, StoryObj} from "@storybook/react"
import {SuperchartCanvas, type ContextMenuItem} from "../helpers/SuperchartCanvas"

interface ContextMenuArgs {
  symbol: string
  period: string
  theme: "dark" | "light"
}

function ContextMenuDemo({symbol, period, theme}: ContextMenuArgs) {
  const onContextMenu = useCallback((time: number, price: number): ContextMenuItem[] => [
    {
      icon: "rewind",
      text: `Start replay from here`,
      hotkey: "Ctrl+R",
      onClick: () => console.log("Start replay", {time, price}),
    },
    {type: "separator"},
    {
      text: `Set solution start`,
      onClick: () => console.log("Solution start", {time, price}),
    },
    {
      text: `Set solution end`,
      onClick: () => console.log("Solution end", {time, price}),
    },
    {type: "separator"},
  ], [])

  return (
    <SuperchartCanvas
      symbol={symbol}
      period={period}
      theme={theme}
      onContextMenu={onContextMenu}
    />
  )
}

const meta: Meta<typeof ContextMenuDemo> = {
  title: "API/ContextMenu",
  component: ContextMenuDemo,
  argTypes: {
    symbol: {control: "text", table: {category: "Chart"}},
    period: {control: "select", options: ["1m", "5m", "15m", "1H", "4H", "1D"], table: {category: "Chart"}},
    theme: {control: "select", options: ["dark", "light"], table: {category: "Chart"}},
  },
}
export default meta

type Story = StoryObj<typeof ContextMenuDemo>

export const Default: Story = {
  args: {
    symbol: "BINA_USDT_BTC",
    period: "1H",
    theme: "dark",
  },
}
