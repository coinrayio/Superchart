import type {Chart, OrderLineEventListener} from "@superchart/index"
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
  align?: "left" | "right"
  marginLeft?: number

  // Line
  lineColor?: string
  lineWidth?: number
  lineStyle?: "solid" | "dashed"

  // Body
  bodyTextColor?: string
  bodyBackgroundColor?: string
  bodyBorderColor?: string

  // Quantity
  quantityTextColor?: string
  quantityBackgroundColor?: string
  quantityBorderColor?: string

  // Cancel button
  cancelButtonIconColor?: string
  cancelButtonBackgroundColor?: string
  cancelButtonBorderColor?: string

  // Shared border
  borderRadius?: number
  borderSize?: number

  onModify?: OrderLineEventListener,
  onCancel?: OrderLineEventListener,
  onMove?: OrderLineEventListener,
  onMoveEnd?: OrderLineEventListener
}

export function createOrder(chart: Chart, order: MockOrder, settings: CreateOrderSettings): OrderLine {
  const {
    showLine, showLabels,
    text, align, marginLeft,
    lineColor, lineWidth, lineStyle,
    bodyTextColor, bodyBackgroundColor, bodyBorderColor,
    quantityTextColor, quantityBackgroundColor, quantityBorderColor,
    cancelButtonIconColor, cancelButtonBackgroundColor, cancelButtonBorderColor,
    borderRadius, borderSize,
    onModify, onCancel, onMove, onMoveEnd
  } = settings

  return createOrderLine(chart, {
    price: order.price,
    text,
    align,
    marginLeft,
    quantity: showLabels ? `@ ${order.price.toFixed(2)}` : undefined,
    lineColor: showLine ? lineColor : "transparent",
    lineStyle: lineStyle ?? "dashed",
    lineWidth: lineWidth ?? 1,
    bodyBackgroundColor,
    bodyBorderColor,
    bodyTextColor,
    isBodyVisible: showLabels,
    quantityBackgroundColor,
    quantityBorderColor,
    quantityTextColor,
    isQuantityVisible: showLabels,
    cancelButtonBackgroundColor,
    cancelButtonBorderColor,
    cancelButtonIconColor,
    isCancelButtonVisible: !!onCancel,
    borderRadius: borderRadius ?? 0,
    borderSize,
    onModify,
    onCancel,
    onMove,
    onMoveEnd,
  })
}

export function removeOrder(line: OrderLine): void {
  line.remove()
}
