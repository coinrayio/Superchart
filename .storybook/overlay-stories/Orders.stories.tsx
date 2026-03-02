import {useCallback, useEffect, useRef, useState} from "react"
import type {Meta, StoryObj} from "@storybook/react"
import type {Chart} from "klinecharts"
import {SuperchartCanvas} from "../helpers/SuperchartCanvas"
import {useCurrentPrice} from "../helpers/useCurrentPrice"
import {draw, removeOrder, type MockOrder, type OrderLine} from "./overlays/order-line"

type Scenario = "mixed" | "limit" | "stopLoss" | "takeProfit" | "trailingStop" | "creating" | "stacked"

function getScenario(scenario: Scenario, numOrders: number): MockOrder[] {
  switch (scenario) {
    case "mixed":
      return [
        {side: "buy", type: "limit", offsetPercent: -1, amount: 0.5},
        {side: "sell", type: "limit", offsetPercent: 1, amount: 0.3},
        {side: "sell", type: "stop", offsetPercent: -3, amount: 0.5},
      ]
    case "limit": {
      const orders: MockOrder[] = []
      for (let i = 0; i < numOrders; i++) {
        const side: "buy" | "sell" = i % 2 === 0 ? "buy" : "sell"
        const sign = side === "buy" ? -1 : 1
        orders.push({side, type: "limit", offsetPercent: sign * (i + 1) * 0.5, amount: 0.1 * (i + 1)})
      }
      return orders
    }
    case "stopLoss":
      return [
        {side: "buy", type: "limit", offsetPercent: -1, amount: 0.5},
        {side: "sell", type: "stop", offsetPercent: -3, amount: 0.5},
      ]
    case "takeProfit":
      return [
        {side: "buy", type: "limit", offsetPercent: -1, amount: 0.5},
        {side: "sell", type: "tp", offsetPercent: 3, amount: 0.5},
      ]
    case "trailingStop":
      return [
        {side: "sell", type: "trailing", offsetPercent: 2, amount: 0.5},
        {side: "sell", type: "stop", offsetPercent: 1, amount: 0.5},
        {side: "buy", type: "limit", offsetPercent: 0.5, amount: 0.5},
      ]
    case "creating":
      return [{side: "buy", type: "limit", offsetPercent: -1, amount: 0.5}]
    case "stacked": {
      const orders: MockOrder[] = []
      for (let i = 0; i < 5; i++) {
        orders.push({
          side: i % 2 === 0 ? "buy" : "sell",
          type: "limit",
          offsetPercent: -0.2 + i * 0.1,
          amount: 0.1 * (i + 1),
        })
      }
      return orders
    }
    default:
      return []
  }
}

interface OrdersArgs {
  showOrders: boolean
  showLabels: boolean
  showSide: boolean
  enableEditing: boolean
  enableCanceling: boolean
  showLine: boolean
  numOrders: number
  scenario: Scenario
  buyColor: string
  sellColor: string
  stopColor: string
  symbol: string
}

function OrdersDemo({showOrders, showLabels, showSide, enableEditing,
                     enableCanceling, showLine, numOrders, scenario,
                     buyColor, sellColor, stopColor, symbol}: OrdersArgs) {
  const [chart, setChart] = useState<Chart | null>(null)
  const linesRef = useRef<OrderLine[]>([])
  const currentPrice = useCurrentPrice(chart)

  const onChart = useCallback((c: Chart) => setChart(c), [])

  const clear = () => {
    linesRef.current.forEach(removeOrder)
    linesRef.current = []
  }

  useEffect(() => {
    if (!chart || !currentPrice) return
    clear()
    if (!showOrders) return
    linesRef.current = draw(chart, getScenario(scenario, numOrders), currentPrice, {
      showLabels, showSide, enableEditing, enableCanceling, showLine,
      isCreating: scenario === "creating",
      buyColor, sellColor, stopColor,
    })
    return clear
  }, [chart, currentPrice, showOrders, showLabels, showSide, enableEditing,
      enableCanceling, showLine, numOrders, scenario, buyColor, sellColor, stopColor])

  return <SuperchartCanvas symbol={symbol} onChart={onChart} />
}

const meta: Meta<typeof OrdersDemo> = {
  title: "Overlays/Orders",
  component: OrdersDemo,
  argTypes: {
    showOrders: {control: "boolean", table: {category: "Settings"}},
    showLabels: {control: "boolean", table: {category: "Settings"}},
    showSide: {control: "boolean", table: {category: "Settings"}},
    enableEditing: {control: "boolean", table: {category: "Settings"}},
    enableCanceling: {control: "boolean", table: {category: "Settings"}},
    showLine: {control: "boolean", table: {category: "Settings"}},
    numOrders: {control: {type: "number", min: 1, max: 5}, table: {category: "Demo Data"}},
    scenario: {control: "select", options: ["mixed", "limit", "stopLoss", "takeProfit", "trailingStop", "creating", "stacked"], table: {category: "Demo Data"}},
    buyColor: {control: "color", table: {category: "Colors"}},
    sellColor: {control: "color", table: {category: "Colors"}},
    stopColor: {control: "color", table: {category: "Colors"}},
    symbol: {control: "text", table: {category: "Chart"}},
  },
}
export default meta

type Story = StoryObj<typeof OrdersDemo>

export const Default: Story = {
  args: {
    showOrders: true,
    showLabels: true,
    showSide: true,
    enableEditing: true,
    enableCanceling: true,
    showLine: true,
    numOrders: 3,
    scenario: "mixed",
    buyColor: "#4CAF50",
    sellColor: "#F44336",
    stopColor: "#FF9800",
    symbol: "BINA_USDT_BTC",
  },
}
