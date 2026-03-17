import {useCallback, useEffect, useMemo, useRef, useState} from "react"
import type {Meta, StoryObj} from "@storybook/react"
import type {Chart} from "@superchart"
import {SuperchartCanvas} from "../helpers/SuperchartCanvas"
import {useCurrentPrice} from "../helpers/useCurrentPrice"
import {createOrder, type MockOrder, type OrderLine, removeOrder} from "./overlays/order-line"

type Scenario = "limit" | "creating" | "stacked"


function getScenario(scenario: Scenario, numOrders: number, currentPrice: number): MockOrder[] {
  switch (scenario) {
    case "limit": {
      const orders: MockOrder[] = []
      for (let i = 0; i < numOrders; i++) {
        const side: "buy" | "sell" = i % 2 === 0 ? "buy" : "sell"
        const sign = side === "buy" ? -1 : 1
        orders.push({
          side,
          type: "limit",
          price: currentPrice * (1 + (sign * (i + 1) * 0.5 / 100)),
          amount: 0.1 * (i + 1)
        })
      }
      return orders
    }
    case "creating":
      return [{side: "buy", type: "limit", price: currentPrice * 0.99, amount: 0.5}]
    case "stacked": {
      const orders: MockOrder[] = []
      for (let i = 0; i < 5; i++) {
        orders.push({
          side: i % 2 === 0 ? "buy" : "sell",
          type: "limit",
          price: currentPrice * (1 + (-0.06 + i * 0.01)),
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
  symbol: string
}

function buildLabel(order: MockOrder, showSide: boolean): string {
  const side = showSide ? `${order.side === "buy" ? "Buy" : "Sell"} ` : ""
  return `${side}${order.amount} BTC`
}

function orderColor(order: MockOrder, buyColor: string, sellColor: string): string {
  return order.side === "buy" ? buyColor : sellColor
}

function OrdersDemo({
                      showOrders, showLabels, showSide, enableEditing,
                      enableCanceling, showLine, numOrders, scenario,
                      buyColor, sellColor, symbol
                    }: OrdersArgs) {
  const [chart, setChart] = useState<Chart | null>(null)
  const linesRef = useRef<OrderLine[]>([])
  const currentPrice = useCurrentPrice(chart)

  const onChart = useCallback((c: Chart) => setChart(c), [])

  const handleOnModify = useCallback((p: unknown) => {
    console.log(`edit order at ${(p as { price: number }).price.toFixed(2)}`)
  }, [])

  const handleOnCancel = useCallback((p: unknown) => {
    console.log(`cancel order at ${(p as { price: number }).price.toFixed(2)}`)
  }, [])

  const handleOnMove = useCallback((p: unknown) => {
    console.log("moving order")
  }, [])

  const handleOnMoveEnd = useCallback((p: unknown) => {
    console.log("moved order to new price")
  }, [])


  const clear = () => {
    linesRef.current.forEach(removeOrder)
    linesRef.current = []
  }


  const [initialPrice, setInitialPrice] = useState<number | null>(null);

  useEffect(() => {
    if (!currentPrice) return;
    setInitialPrice(prev => {
      if (prev !== null) return prev;
      return currentPrice;
    });
  }, [currentPrice])

  const orders = useMemo(() => {
    if (!initialPrice) return [];
    return getScenario(scenario, numOrders, initialPrice);
  }, [scenario, numOrders, initialPrice]);


  const isCreating = scenario === "creating"

  const draw = useCallback((): OrderLine[] => {
    if (!chart) return []

    return orders.map(order => {
      const price = order.price
      const text = showLabels ? (isCreating ? "Creating..." : buildLabel(order, showSide)) : undefined
      const color = orderColor(order, buyColor, sellColor)

      return createOrder(chart, order, {
        showLine, showLabels,
        text, color,
        onModify: enableEditing && !isCreating ? {params: {price}, callback: handleOnModify} : undefined,
        onCancel: enableCanceling && !isCreating ? {params: {price}, callback: handleOnCancel} : undefined,
        onMove: {params: {price}, callback: handleOnMove},
        onMoveEnd: {params: {price}, callback: handleOnMoveEnd},
      })
    })
  }, [
    chart, showLabels, showSide, showLine,
    buyColor, sellColor,
    enableCanceling, enableEditing,
    isCreating, orders,
    handleOnModify, handleOnCancel, handleOnMove, handleOnMoveEnd,
  ])


  useEffect(() => {
    if (!chart || !currentPrice) return
    clear()
    if (!showOrders) return
    linesRef.current = draw()
    return clear
  }, [chart, currentPrice, showOrders, draw])

  return <SuperchartCanvas symbol={symbol} onChart={onChart}/>
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
    scenario: {
      control: "select",
      options: ["limit", "creating", "stacked"],
      table: {category: "Demo Data"}
    },
    buyColor: {control: "color", table: {category: "Colors"}},
    sellColor: {control: "color", table: {category: "Colors"}},
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
    scenario: "limit",
    buyColor: "#4CAF50",
    sellColor: "#F44336",
    symbol: "BINA_USDT_BTC",
  },
}
