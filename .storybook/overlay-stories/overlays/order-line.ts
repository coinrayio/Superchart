import type {Chart, OrderLineEventListener} from "klinecharts"
import {createOrderLine, type OrderLine, type OrderLineProperties} from "@superchart/index"

export type {OrderLine, OrderLineProperties}

export interface MockOrder {
  side: "buy" | "sell"
  type: "limit" | "stop" | "tp" | "trailing"
  price: number,
  amount: number
}

export interface CreateOrderSettings {
  showLine: boolean
  showLabels: boolean
  text?: string
  color: string
  onModify?: OrderLineEventListener,
  onCancel?: OrderLineEventListener,
  onMove?: OrderLineEventListener,
  onMoveEnd?: OrderLineEventListener
}

export function createOrder(chart: Chart, order: MockOrder, settings: CreateOrderSettings): OrderLine {
  const {
    showLine, showLabels,
    text, color,
    onModify, onCancel, onMove, onMoveEnd
  } = settings

  return createOrderLine(chart, {
    price:order.price,
    text,
    quantity: showLabels ? `@ ${order.price.toFixed(2)}` : undefined,
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
    isCancelButtonVisible: !!onCancel,
    onModify,
    onCancel,
    onMove,
    onMoveEnd,
  })
}

export function removeOrder(line: OrderLine): void {
  line.remove()
}
