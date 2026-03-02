import type {Chart} from "klinecharts"
import {createOrderLine, type OrderLine, type OrderLineProperties} from "@superchart/index"

export type {OrderLine, OrderLineProperties}

export interface MockOrder {
  side: "buy" | "sell"
  type: "limit" | "stop" | "tp" | "trailing"
  offsetPercent: number
  amount: number
}

export interface DrawSettings {
  showLabels: boolean
  showSide: boolean
  enableEditing: boolean
  enableCanceling: boolean
  showLine: boolean
  isCreating: boolean
  buyColor: string
  sellColor: string
  stopColor: string
}

function buildLabel(order: MockOrder, showSide: boolean): string {
  const side = showSide ? `${order.side === "buy" ? "Buy" : "Sell"} ` : ""
  if (order.type === "stop") return `Stop Loss ${side}${order.amount} BTC`
  if (order.type === "tp") return `TP #1 ${side}${order.amount} BTC`
  if (order.type === "trailing") return `TS #1 ${side}${order.amount} BTC`
  return `${side}${order.amount} BTC`
}

function orderColor(order: MockOrder, buyColor: string, sellColor: string, stopColor: string): string {
  if (order.type === "stop" || order.type === "trailing") return stopColor
  return order.side === "buy" ? buyColor : sellColor
}

export function createOrder(chart: Chart, order: MockOrder, currentPrice: number, settings: DrawSettings): OrderLine {
  const {showLabels, showSide, enableEditing, enableCanceling, showLine, isCreating,
         buyColor, sellColor, stopColor} = settings
  const price = currentPrice * (1 + order.offsetPercent / 100)
  const color = orderColor(order, buyColor, sellColor, stopColor)

  return createOrderLine(chart, {
    price,
    text: showLabels ? (isCreating ? "Creating..." : buildLabel(order, showSide)) : undefined,
    quantity: showLabels ? `@ ${price.toFixed(2)}` : undefined,
    lineColor: showLine ? color : "transparent",
    lineStyle: "dashed",
    lineWidth: 1,
    bodyBackgroundColor: color,
    bodyBorderColor: color,
    bodyTextColor: "#FFFFFF",
    isBodyVisible: showLabels,
    quantityBackgroundColor: color,
    quantityBorderColor: color,
    quantityColor: "#FFFFFF",
    isQuantityVisible: showLabels,
    cancelButtonBackgroundColor: color,
    cancelButtonBorderColor: color,
    cancelButtonIconColor: "#FFFFFF",
    isCancelButtonVisible: !isCreating && enableCanceling,
    onModify: enableEditing && !isCreating
      ? {params: {price}, callback: (p: unknown) => console.log(`edit order at ${(p as {price: number}).price.toFixed(2)}`)}
      : undefined,
    onCancel: enableCanceling && !isCreating
      ? {params: {price}, callback: (p: unknown) => console.log(`cancel order at ${(p as {price: number}).price.toFixed(2)}`)}
      : undefined,
    onMove: {params: {}, callback: () => console.log("moving order")},
    onMoveEnd: {params: {}, callback: () => console.log("moved order to new price")},
  })
}

export function draw(chart: Chart, orders: MockOrder[], currentPrice: number, settings: DrawSettings): OrderLine[] {
  return orders.map(order => createOrder(chart, order, currentPrice, settings))
}

export function removeOrder(line: OrderLine): void {
  line.remove()
}
