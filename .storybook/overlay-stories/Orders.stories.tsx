import {useCallback, useEffect, useMemo, useRef, useState} from "react"
import type {Meta, StoryObj} from "@storybook/react"
import type {Chart, OverlayEvent} from "@superchart/index"
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
  showBody: boolean
  showQuantity: boolean
  showSide: boolean
  enableModify: boolean
  enableCanceling: boolean
  showLine: boolean
  align: "left" | "right"
  numOrders: number
  scenario: Scenario
  symbol: string

  // Line
  buyLineColor: string
  sellLineColor: string
  lineWidth: number
  lineStyle: "solid" | "dashed"

  // Body
  bodyTextColor: string
  buyBodyBackgroundColor: string
  sellBodyBackgroundColor: string
  buyBodyBorderColor: string
  sellBodyBorderColor: string

  // Quantity
  quantityTextColor: string
  buyQuantityBackgroundColor: string
  sellQuantityBackgroundColor: string
  buyQuantityBorderColor: string
  sellQuantityBorderColor: string

  // Cancel button
  cancelButtonIconColor: string
  buyCancelBackgroundColor: string
  sellCancelBackgroundColor: string
  buyCancelBorderColor: string
  sellCancelBorderColor: string

  // Shared border
  borderRadius: number
  borderSize: number
}

function buildLabel(order: MockOrder, showSide: boolean): string {
  const side = showSide ? `${order.side === "buy" ? "Buy" : "Sell"} ` : ""
  return `${side}${order.amount} BTC`
}

function OrdersDemo(args: OrdersArgs) {
  const {
    showOrders, showBody, showQuantity, showSide, enableModify,
    enableCanceling, showLine, align, numOrders, scenario, symbol,
    buyLineColor, sellLineColor, lineWidth, lineStyle,
    bodyTextColor, buyBodyBackgroundColor, sellBodyBackgroundColor,
    buyBodyBorderColor, sellBodyBorderColor,
    quantityTextColor, buyQuantityBackgroundColor, sellQuantityBackgroundColor,
    buyQuantityBorderColor, sellQuantityBorderColor,
    cancelButtonIconColor, buyCancelBackgroundColor, sellCancelBackgroundColor,
    buyCancelBorderColor, sellCancelBorderColor,
    borderRadius, borderSize,
  } = args
  const [chart, setChart] = useState<Chart | null>(null)
  const linesRef = useRef<OrderLine[]>([])
  const currentPrice = useCurrentPrice(chart)

  const onChart = useCallback((c: Chart) => setChart(c), [])

  const handleOnModify = useCallback((p: unknown) => {
    const price = (p as { price: number }).price.toFixed(2)
    console.log(`[onModify] order at ${price}`)
  }, [])

  const handleOnCancel = useCallback((p: unknown) => {
    const price = (p as { price: number }).price.toFixed(2)
    console.log(`[onCancel] order at ${price}`)
  }, [])

  const handleOnMove = useCallback((_p: { index: number }, event?: OverlayEvent) => {
    const newPrice = event?.overlay.points[0]?.value
    console.log("[onMove] dragging order", newPrice)
  }, [])

  const handleOnMoveEnd = useCallback((p: { index: number }, event?: OverlayEvent) => {
    const newPrice = event?.overlay.points[0]?.value
    if (newPrice === undefined) return
    console.log("[onMoveEnd] moved order to new price", newPrice)
    setOrders(prev => prev.map((o, i) => i === p.index ? {...o, price: newPrice} : o))
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

  const [orders, setOrders] = useState<MockOrder[]>([]);

  useEffect(() => {
    if (!initialPrice) return;
    setOrders(getScenario(scenario, numOrders, initialPrice));
  }, [scenario, numOrders, initialPrice]);


  const isCreating = scenario === "creating"

  const draw = useCallback((): OrderLine[] => {
    if (!chart) return []

    return orders.map((order, index) => {
      const price = order.price
      const text = showBody ? (isCreating ? "Creating..." : buildLabel(order, showSide)) : undefined
      const isBuy = order.side === "buy"

      return createOrder(chart, order, {
        showLine, showBody, showQuantity,
        text, align,
        lineColor: isBuy ? buyLineColor : sellLineColor,
        lineWidth,
        lineStyle,
        bodyTextColor,
        bodyBackgroundColor: isBuy ? buyBodyBackgroundColor : sellBodyBackgroundColor,
        bodyBorderColor: isBuy ? buyBodyBorderColor : sellBodyBorderColor,
        quantityTextColor,
        quantityBackgroundColor: isBuy ? buyQuantityBackgroundColor : sellQuantityBackgroundColor,
        quantityBorderColor: isBuy ? buyQuantityBorderColor : sellQuantityBorderColor,
        cancelButtonIconColor,
        cancelButtonBackgroundColor: isBuy ? buyCancelBackgroundColor : sellCancelBackgroundColor,
        cancelButtonBorderColor: isBuy ? buyCancelBorderColor : sellCancelBorderColor,
        borderRadius,
        borderSize,
        onModify: enableModify && !isCreating ? {params: {price}, callback: handleOnModify} : undefined,
        onCancel: enableCanceling && !isCreating ? {params: {price}, callback: handleOnCancel} : undefined,
        onMove: {params: {index}, callback: handleOnMove},
        onMoveEnd: {params: {index}, callback: handleOnMoveEnd},
      })
    })
  }, [
    chart, showBody, showQuantity, showSide, showLine, align,
    buyLineColor, sellLineColor, lineWidth, lineStyle,
    bodyTextColor, buyBodyBackgroundColor, sellBodyBackgroundColor,
    buyBodyBorderColor, sellBodyBorderColor,
    quantityTextColor, buyQuantityBackgroundColor, sellQuantityBackgroundColor,
    buyQuantityBorderColor, sellQuantityBorderColor,
    cancelButtonIconColor, buyCancelBackgroundColor, sellCancelBackgroundColor,
    buyCancelBorderColor, sellCancelBorderColor,
    borderRadius, borderSize,
    enableCanceling, enableModify,
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
    showBody: {control: "boolean", table: {category: "Settings"}},
    showQuantity: {control: "boolean", table: {category: "Settings"}},
    showSide: {control: "boolean", table: {category: "Settings"}},
    enableModify: {control: "boolean", table: {category: "Settings"}},
    enableCanceling: {control: "boolean", table: {category: "Settings"}},
    showLine: {control: "boolean", table: {category: "Settings"}},
    align: {control: "select", options: ["left", "right"], table: {category: "Layout"}},
    numOrders: {control: {type: "number", min: 1, max: 5}, table: {category: "Demo Data"}},
    scenario: {control: "select", options: ["limit", "creating", "stacked"], table: {category: "Demo Data"}},
    symbol: {control: "text", table: {category: "Chart"}},

    // Line
    buyLineColor: {control: "color", table: {category: "Line"}},
    sellLineColor: {control: "color", table: {category: "Line"}},
    lineWidth: {control: {type: "number", min: 1, max: 5}, table: {category: "Line"}},
    lineStyle: {control: "select", options: ["solid", "dashed"], table: {category: "Line"}},

    // Body
    bodyTextColor: {control: "color", table: {category: "Body"}},
    buyBodyBackgroundColor: {control: "color", table: {category: "Body"}},
    sellBodyBackgroundColor: {control: "color", table: {category: "Body"}},
    buyBodyBorderColor: {control: "color", table: {category: "Body"}},
    sellBodyBorderColor: {control: "color", table: {category: "Body"}},

    // Quantity
    quantityTextColor: {control: "color", table: {category: "Quantity"}},
    buyQuantityBackgroundColor: {control: "color", table: {category: "Quantity"}},
    sellQuantityBackgroundColor: {control: "color", table: {category: "Quantity"}},
    buyQuantityBorderColor: {control: "color", table: {category: "Quantity"}},
    sellQuantityBorderColor: {control: "color", table: {category: "Quantity"}},

    // Cancel button
    cancelButtonIconColor: {control: "color", table: {category: "Cancel Button"}},
    buyCancelBackgroundColor: {control: "color", table: {category: "Cancel Button"}},
    sellCancelBackgroundColor: {control: "color", table: {category: "Cancel Button"}},
    buyCancelBorderColor: {control: "color", table: {category: "Cancel Button"}},
    sellCancelBorderColor: {control: "color", table: {category: "Cancel Button"}},

    // Shared border
    borderRadius: {control: {type: "number", min: 0, max: 10}, table: {category: "Border"}},
    borderSize: {control: {type: "number", min: 0, max: 5}, table: {category: "Border"}},
  },
}
export default meta

type Story = StoryObj<typeof OrdersDemo>

export const Default: Story = {
  args: {
    showOrders: true,
    showBody: true,
    showQuantity: true,
    showSide: true,
    enableModify: true,
    enableCanceling: true,
    showLine: true,
    align: "right",
    numOrders: 3,
    scenario: "limit",
    symbol: "BINA_USDT_BTC",

    // Line
    buyLineColor: "#4caf50",
    sellLineColor: "#f44336",
    lineWidth: 1,
    lineStyle: "dashed",

    // Body
    bodyTextColor: "#FFFFFF",
    buyBodyBackgroundColor: "#4caf50",
    sellBodyBackgroundColor: "#f44336",
    buyBodyBorderColor: "#FFFFFF",
    sellBodyBorderColor: "#FFFFFF",

    // Quantity
    quantityTextColor: "#FFFFFF",
    buyQuantityBackgroundColor: "#4caf50",
    sellQuantityBackgroundColor: "#f44336",
    buyQuantityBorderColor: "#FFFFFF",
    sellQuantityBorderColor: "#FFFFFF",

    // Cancel button
    cancelButtonIconColor: "#FFFFFF",
    buyCancelBackgroundColor: "#4caf50",
    sellCancelBackgroundColor: "#f44336",
    buyCancelBorderColor: "#FFFFFF",
    sellCancelBorderColor: "#FFFFFF",

    // Border
    borderRadius: 0,
    borderSize: 1,
  },
}

export const LeftAligned: Story = {
  args: {
    ...Default.args,
    align: "left",
    numOrders: 2,
  },
}
