import type { OverlayEvent, Chart } from 'klinecharts'

// ---------------------------------------------------------------------------
// OrderLineProperties — stored on the overlay, read by createPointFigures
// ---------------------------------------------------------------------------

export interface OrderLineEventListener {
  params: unknown
  callback: (params: unknown, event?: OverlayEvent<unknown>) => void
}

export interface OrderLineProperties {
  /** Price level for the horizontal line */
  price?: number
  /** Body label text (e.g., "Buy BTCUSDT") */
  text?: string
  /** Quantity/size label */
  quantity?: number | string
  /** Tooltip text on hover */
  tooltip?: string
  /** Tooltip for the modify action */
  modifyTooltip?: string

  // -- Layout --
  /** Handle alignment: 'right' (default, near y-axis) or 'left' (e.g. AVG ENTRY) */
  align?: 'left' | 'right'
  /** Right margin from canvas edge (px) — used when align='right' */
  marginRight?: number
  /** Left margin from canvas edge (px) — used when align='left' */
  marginLeft?: number

  // -- Line styling --
  lineColor?: string
  lineWidth?: number
  lineStyle?: 'solid' | 'dashed'
  lineDashedValue?: number[]
  /** How far the line extends from left (0 = full width) */
  lineLength?: number

  // -- Body label styling --
  bodyFont?: string
  bodyFontSize?: number
  bodyFontWeight?: number | string
  bodyTextColor?: string
  bodyBackgroundColor?: string
  bodyBorderColor?: string
  bodyPaddingLeft?: number
  bodyPaddingRight?: number
  bodyPaddingTop?: number
  bodyPaddingBottom?: number
  isBodyVisible?: boolean

  // -- Quantity label styling --
  quantityFont?: string
  quantityFontSize?: number
  quantityFontWeight?: number | string
  quantityTextColor?: string
  quantityBackgroundColor?: string
  quantityBorderColor?: string
  quantityPaddingLeft?: number
  quantityPaddingRight?: number
  quantityPaddingTop?: number
  quantityPaddingBottom?: number
  isQuantityVisible?: boolean

  // -- Cancel button styling --
  cancelButtonFontSize?: number
  cancelButtonFontWeight?: number | string
  cancelButtonIconColor?: string
  cancelButtonBackgroundColor?: string
  cancelButtonBorderColor?: string
  cancelButtonPaddingLeft?: number
  cancelButtonPaddingRight?: number
  cancelButtonPaddingTop?: number
  cancelButtonPaddingBottom?: number
  isCancelButtonVisible?: boolean

  // -- Shared border --
  borderStyle?: 'solid' | 'dashed'
  borderSize?: number
  borderDashedValue?: number[]
  borderRadius?: number

  // -- Behavior (matches TradingView API) --
  /** Whether the line can be dragged to a new price (default: true) */
  editable?: boolean
  /** Extend the line leftward past the visible range */
  extendLeft?: boolean
  /** Tooltip text for the cancel button */
  cancelTooltip?: string

  // -- Event listeners (generic callback pattern) --
  onMoveStart?: OrderLineEventListener
  onMove?: OrderLineEventListener
  onMoveEnd?: OrderLineEventListener
  onCancel?: OrderLineEventListener
  onModify?: OrderLineEventListener
}

// ---------------------------------------------------------------------------
// OrderLine — fluent API returned by createOrderLine()
// ---------------------------------------------------------------------------

export interface OrderLine {
  /** Overlay ID on the chart */
  readonly id: string
  /** Pane ID where the overlay is rendered */
  readonly paneId: string

  // -- Core data (getter/setter pairs, TradingView-compatible) --
  getPrice: () => number | undefined
  setPrice: (price: number) => OrderLine
  getText: () => string | undefined
  setText: (text: string) => OrderLine
  getQuantity: () => number | string | undefined
  setQuantity: (quantity: number | string) => OrderLine
  getTooltip: () => string | undefined
  setTooltip: (tooltip: string) => OrderLine
  getModifyTooltip: () => string | undefined
  setModifyTooltip: (tooltip: string) => OrderLine
  getCancelTooltip: () => string | undefined
  setCancelTooltip: (tooltip: string) => OrderLine

  // -- Behavior (TradingView-compatible) --
  getEditable: () => boolean
  setEditable: (editable: boolean) => OrderLine
  getExtendLeft: () => boolean
  setExtendLeft: (extend: boolean) => OrderLine

  // -- Layout --
  setAlign: (align: 'left' | 'right') => OrderLine
  setMarginLeft: (margin: number) => OrderLine
  setMarginRight: (margin: number) => OrderLine

  // -- Line styling --
  getLineColor: () => string | undefined
  setLineColor: (color: string) => OrderLine
  getLineWidth: () => number | undefined
  setLineWidth: (width: number) => OrderLine
  getLineStyle: () => 'solid' | 'dashed' | undefined
  setLineStyle: (style: 'solid' | 'dashed') => OrderLine
  setLineDashedValue: (dashedValue: number[]) => OrderLine
  getLineLength: () => number | undefined
  setLineLength: (length: number) => OrderLine

  // -- Body label styling --
  getBodyFont: () => string | undefined
  setBodyFont: (font: string) => OrderLine
  setBodyFontWeight: (weight: number | string) => OrderLine
  getBodyTextColor: () => string | undefined
  setBodyTextColor: (color: string) => OrderLine
  getBodyBackgroundColor: () => string | undefined
  setBodyBackgroundColor: (color: string) => OrderLine
  getBodyBorderColor: () => string | undefined
  setBodyBorderColor: (color: string) => OrderLine

  // -- Quantity label styling --
  getQuantityFont: () => string | undefined
  setQuantityFont: (font: string) => OrderLine
  setQuantityFontWeight: (weight: number | string) => OrderLine
  getQuantityTextColor: () => string | undefined
  setQuantityTextColor: (color: string) => OrderLine
  getQuantityBackgroundColor: () => string | undefined
  setQuantityBackgroundColor: (color: string) => OrderLine
  getQuantityBorderColor: () => string | undefined
  setQuantityBorderColor: (color: string) => OrderLine

  // -- Cancel button styling --
  getCancelButtonIconColor: () => string | undefined
  setCancelButtonIconColor: (color: string) => OrderLine
  getCancelButtonBackgroundColor: () => string | undefined
  setCancelButtonBackgroundColor: (color: string) => OrderLine
  getCancelButtonBorderColor: () => string | undefined
  setCancelButtonBorderColor: (color: string) => OrderLine

  // -- Shared border --
  setBorderStyle: (style: 'solid' | 'dashed') => OrderLine
  setBorderSize: (size: number) => OrderLine
  setBorderRadius: (radius: number) => OrderLine

  // -- Visibility toggles --
  setBodyVisible: (visible: boolean) => OrderLine
  setQuantityVisible: (visible: boolean) => OrderLine
  setCancelButtonVisible: (visible: boolean) => OrderLine

  // -- Event listeners (generic T for consumer data) --
  onMoveStart: <T>(params: T, callback: (params: T, event?: OverlayEvent<unknown>) => void) => OrderLine
  onMove: <T>(params: T, callback: (params: T, event?: OverlayEvent<unknown>) => void) => OrderLine
  onMoveEnd: <T>(params: T, callback: (params: T, event?: OverlayEvent<unknown>) => void) => OrderLine
  onCancel: <T>(params: T, callback: (params: T, event?: OverlayEvent<unknown>) => void) => OrderLine
  onModify: <T>(params: T, callback: (params: T, event?: OverlayEvent<unknown>) => void) => OrderLine

  // -- Lifecycle --
  getProperties: () => OrderLineProperties
  remove: () => void
}

// ---------------------------------------------------------------------------
// Default style type (used by orderLineStyleStore)
// ---------------------------------------------------------------------------

export interface OrderLineStyle {
  lineStyle: {
    style: 'solid' | 'dashed'
    size: number
    color: string
    dashedValue: number[]
  }
  labelStyle: {
    fontSize: number
    fontFamily: string
    fontWeight: string | number
    paddingLeft: number
    paddingRight: number
    paddingTop: number
    paddingBottom: number
    borderStyle: 'solid' | 'dashed'
    borderSize: number
    borderDashedValue: number[]
    borderRadius: number
    color: string
    borderColor: string
    backgroundColor: string
  }
}

// ---------------------------------------------------------------------------
// createOrderLine factory function
// ---------------------------------------------------------------------------

/**
 * Create an order line overlay on a chart and return a fluent API for updates.
 *
 * @param chart - The klinecharts Chart instance
 * @param options - Initial order line properties
 * @returns OrderLine fluent API object
 *
 * @example
 * ```typescript
 * const orderLine = createOrderLine(chart, { price: 50000, text: 'Buy' })
 *   .setLineColor('#00ff00')
 *   .setQuantity('0.5 BTC')
 *   .onCancel({ orderId: '123' }, (params) => cancelOrder(params.orderId))
 * ```
 */
export function createOrderLine (
  chart: Chart,
  options?: Partial<OrderLineProperties>
): OrderLine {
  // 1. Create the overlay on the chart
  const result = chart.createOverlay({
    name: 'orderLine',
    points: [{ value: options?.price ?? 0 }],
    mode: 'normal',
    modeSensitivity: 4,
    lock: options?.editable === false,
    visible: true,
    extendData: options,
    paneId: 'candle_pane'
  })
  const overlayId = typeof result === 'string' ? result : null

  // 2. Store properties internally
  const properties: OrderLineProperties = { ...options }

  // 3. Update helper — pushes current properties back to the overlay
  function update (): void {
    if (overlayId === null) return
    chart.overrideOverlay({
      id: overlayId,
      extendData: { ...properties },
      points: [{ value: properties.price ?? 0 }]
    })
  }

  // 4. Build the fluent API object
  const self: OrderLine = {
    // -- Readonly getters --
    get id (): string {
      return overlayId ?? ''
    },

    get paneId (): string {
      return 'candle_pane'
    },

    // -- Core data (getter/setter pairs) --
    getPrice (): number | undefined { return properties.price },
    setPrice (price: number): OrderLine { properties.price = price; update(); return self },

    getText (): string | undefined { return properties.text },
    setText (text: string): OrderLine { properties.text = text; update(); return self },

    getQuantity (): number | string | undefined { return properties.quantity },
    setQuantity (quantity: number | string): OrderLine { properties.quantity = quantity; update(); return self },

    getTooltip (): string | undefined { return properties.tooltip },
    setTooltip (tooltip: string): OrderLine { properties.tooltip = tooltip; update(); return self },

    getModifyTooltip (): string | undefined { return properties.modifyTooltip },
    setModifyTooltip (tooltip: string): OrderLine { properties.modifyTooltip = tooltip; update(); return self },

    getCancelTooltip (): string | undefined { return properties.cancelTooltip },
    setCancelTooltip (tooltip: string): OrderLine { properties.cancelTooltip = tooltip; update(); return self },

    // -- Behavior (TradingView-compatible) --
    getEditable (): boolean { return properties.editable !== false },
    setEditable (editable: boolean): OrderLine {
      properties.editable = editable
      if (overlayId !== null) {
        chart.overrideOverlay({ id: overlayId, lock: !editable })
      }
      return self
    },

    getExtendLeft (): boolean { return properties.extendLeft === true },
    setExtendLeft (extend: boolean): OrderLine { properties.extendLeft = extend; update(); return self },

    // -- Layout --
    setAlign (align: 'left' | 'right'): OrderLine { properties.align = align; update(); return self },
    setMarginLeft (margin: number): OrderLine { properties.marginLeft = margin; update(); return self },
    setMarginRight (margin: number): OrderLine { properties.marginRight = margin; update(); return self },

    // -- Line styling --
    getLineColor (): string | undefined { return properties.lineColor },
    setLineColor (color: string): OrderLine { properties.lineColor = color; update(); return self },

    getLineWidth (): number | undefined { return properties.lineWidth },
    setLineWidth (width: number): OrderLine { properties.lineWidth = width; update(); return self },

    getLineStyle (): 'solid' | 'dashed' | undefined { return properties.lineStyle },
    setLineStyle (style: 'solid' | 'dashed'): OrderLine { properties.lineStyle = style; update(); return self },

    setLineDashedValue (dashedValue: number[]): OrderLine { properties.lineDashedValue = dashedValue; update(); return self },

    getLineLength (): number | undefined { return properties.lineLength },
    setLineLength (length: number): OrderLine { properties.lineLength = length; update(); return self },

    // -- Body label styling --
    getBodyFont (): string | undefined { return properties.bodyFont },
    setBodyFont (font: string): OrderLine { properties.bodyFont = font; update(); return self },

    setBodyFontWeight (weight: number | string): OrderLine { properties.bodyFontWeight = weight; update(); return self },

    getBodyTextColor (): string | undefined { return properties.bodyTextColor },
    setBodyTextColor (color: string): OrderLine { properties.bodyTextColor = color; update(); return self },

    getBodyBackgroundColor (): string | undefined { return properties.bodyBackgroundColor },
    setBodyBackgroundColor (color: string): OrderLine { properties.bodyBackgroundColor = color; update(); return self },

    getBodyBorderColor (): string | undefined { return properties.bodyBorderColor },
    setBodyBorderColor (color: string): OrderLine { properties.bodyBorderColor = color; update(); return self },

    // -- Quantity label styling --
    getQuantityFont (): string | undefined { return properties.quantityFont },
    setQuantityFont (font: string): OrderLine { properties.quantityFont = font; update(); return self },

    setQuantityFontWeight (weight: number | string): OrderLine { properties.quantityFontWeight = weight; update(); return self },

    getQuantityTextColor (): string | undefined { return properties.quantityTextColor },
    setQuantityTextColor (color: string): OrderLine { properties.quantityTextColor = color; update(); return self },

    getQuantityBackgroundColor (): string | undefined { return properties.quantityBackgroundColor },
    setQuantityBackgroundColor (color: string): OrderLine { properties.quantityBackgroundColor = color; update(); return self },

    getQuantityBorderColor (): string | undefined { return properties.quantityBorderColor },
    setQuantityBorderColor (color: string): OrderLine { properties.quantityBorderColor = color; update(); return self },

    // -- Cancel button styling --
    getCancelButtonIconColor (): string | undefined { return properties.cancelButtonIconColor },
    setCancelButtonIconColor (color: string): OrderLine { properties.cancelButtonIconColor = color; update(); return self },

    getCancelButtonBackgroundColor (): string | undefined { return properties.cancelButtonBackgroundColor },
    setCancelButtonBackgroundColor (color: string): OrderLine { properties.cancelButtonBackgroundColor = color; update(); return self },

    getCancelButtonBorderColor (): string | undefined { return properties.cancelButtonBorderColor },
    setCancelButtonBorderColor (color: string): OrderLine { properties.cancelButtonBorderColor = color; update(); return self },

    // -- Shared border --
    setBorderStyle (style: 'solid' | 'dashed'): OrderLine { properties.borderStyle = style; update(); return self },
    setBorderSize (size: number): OrderLine { properties.borderSize = size; update(); return self },
    setBorderRadius (radius: number): OrderLine { properties.borderRadius = radius; update(); return self },

    // -- Visibility toggles --
    setBodyVisible (visible: boolean): OrderLine { properties.isBodyVisible = visible; update(); return self },
    setQuantityVisible (visible: boolean): OrderLine { properties.isQuantityVisible = visible; update(); return self },
    setCancelButtonVisible (visible: boolean): OrderLine { properties.isCancelButtonVisible = visible; update(); return self },

    // -- Event listeners --
    onMoveStart<T> (params: T, callback: (params: T, event?: OverlayEvent<unknown>) => void): OrderLine {
      properties.onMoveStart = { params, callback: callback as (p: unknown, e?: OverlayEvent<unknown>) => void }
      update()
      return self
    },

    onMove<T> (params: T, callback: (params: T, event?: OverlayEvent<unknown>) => void): OrderLine {
      properties.onMove = { params, callback: callback as (p: unknown, e?: OverlayEvent<unknown>) => void }
      update()
      return self
    },

    onMoveEnd<T> (params: T, callback: (params: T, event?: OverlayEvent<unknown>) => void): OrderLine {
      properties.onMoveEnd = { params, callback: callback as (p: unknown, e?: OverlayEvent<unknown>) => void }
      update()
      return self
    },

    onCancel<T> (params: T, callback: (params: T, event?: OverlayEvent<unknown>) => void): OrderLine {
      properties.onCancel = { params, callback: callback as (p: unknown, e?: OverlayEvent<unknown>) => void }
      update()
      return self
    },

    onModify<T> (params: T, callback: (params: T, event?: OverlayEvent<unknown>) => void): OrderLine {
      properties.onModify = { params, callback: callback as (p: unknown, e?: OverlayEvent<unknown>) => void }
      update()
      return self
    },

    // -- Lifecycle --
    getProperties (): OrderLineProperties {
      return { ...properties }
    },

    remove (): void {
      if (overlayId !== null) {
        chart.removeOverlay({ id: overlayId })
      }
    }
  }

  return self
}
