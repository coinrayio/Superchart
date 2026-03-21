/**
 * Order Line Overlay
 *
 * Sections (left to right): [body] [quantity] [cancelButton]
 * - body: draggable area (click does nothing)
 * - quantity: clickable area that calls onModify
 * - cancelButton: X icon (icomoon \ue900) that calls onCancel
 *
 * All sections are independently toggle-able. Hidden sections leave no gap.
 * Supports align: 'left' | 'right' for handle positioning.
 * Draws two price lines (price-line-left and price-line-right) that skip the label area.
 */

import {
  utils,
  type DeepPartial,
  type ProOverlayTemplate,
} from 'klinecharts'

import type { OrderLineProperties } from './orderLineApi'

const { calcTextWidth, merge, clone } = utils

// ---------------------------------------------------------------------------
// Default style constants
// ---------------------------------------------------------------------------

const defaultOrderLineStyle = {
  align: 'right' as const,
  lineColor: '#00698b',
  lineWidth: 1,
  lineStyle: 'dashed' as const,
  lineDashedValue: [4, 4],
  marginRight: 60,
  marginLeft: 0,
  bodySize: 12,
  bodyFont: 'Helvetica Neue',
  bodyWeight: 'normal' as string | number,
  bodyTextColor: '#FFFFFF',
  bodyBackgroundColor: '#00698b',
  bodyBorderColor: '#00698b',
  bodyPaddingLeft: 5,
  bodyPaddingRight: 5,
  bodyPaddingTop: 5,
  bodyPaddingBottom: 5,
  quantitySize: 12,
  quantityFont: 'Helvetica Neue',
  quantityWeight: 'normal' as string | number,
  quantityTextColor: '#FFFFFF',
  quantityBackgroundColor: '#00698b',
  quantityBorderColor: '#00698b',
  quantityPaddingLeft: 5,
  quantityPaddingRight: 5,
  quantityPaddingTop: 5,
  quantityPaddingBottom: 5,
  cancelButtonSize: 12,
  cancelButtonWeight: 'normal' as string | number,
  cancelButtonIconColor: '#FFFFFF',
  cancelButtonBackgroundColor: '#00698b',
  cancelButtonBorderColor: '#00698b',
  cancelButtonPaddingLeft: 5,
  cancelButtonPaddingRight: 5,
  cancelButtonPaddingTop: 5,
  cancelButtonPaddingBottom: 5,
  borderStyle: 'solid' as const,
  borderSize: 1,
  borderDashedValue: [2, 2],
  borderRadius: 0
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

const orderLine = (): ProOverlayTemplate => {
  let properties: DeepPartial<OrderLineProperties> = {}

  const _extRef: { data: DeepPartial<OrderLineProperties> | null } = { data: null }

  const prop = <K extends keyof OrderLineProperties>(key: K): OrderLineProperties[K] => {
    const ext = _extRef.data as Record<string, unknown> | null
    const props = properties as Record<string, unknown>
    const defaults = defaultOrderLineStyle as Record<string, unknown>
    return (ext?.[key] ?? props[key] ?? defaults[key]) as OrderLineProperties[K]
  }

  return {
    name: 'orderLine',
    totalStep: 2,
    needDefaultPointFigure: false,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,

    // -----------------------------------------------------------------------
    // createPointFigures
    // -----------------------------------------------------------------------
    createPointFigures: ({ coordinates, bounding, overlay }) => {
      const figures: Array<{
        type: string
        key?: string
        attrs: Record<string, unknown>
        styles?: Record<string, unknown>
        ignoreEvent?: boolean
      }> = []

      if (coordinates.length === 0) return []

      _extRef.data = (overlay.extendData != null && typeof overlay.extendData === 'object')
        ? overlay.extendData as DeepPartial<OrderLineProperties>
        : null

      const y = coordinates[0].y
      const align = prop('align') ?? defaultOrderLineStyle.align

      const marginRight = prop('marginRight') ?? defaultOrderLineStyle.marginRight
      const marginLeft = prop('marginLeft') ?? defaultOrderLineStyle.marginLeft
      const borderSize = prop('borderSize') ?? defaultOrderLineStyle.borderSize
      const borderStyle = prop('borderStyle') ?? defaultOrderLineStyle.borderStyle
      const borderDashedValue = prop('borderDashedValue') ?? defaultOrderLineStyle.borderDashedValue
      const borderRadius = prop('borderRadius') ?? defaultOrderLineStyle.borderRadius

      const lineColor = prop('lineColor') ?? defaultOrderLineStyle.lineColor
      const lineWidth = prop('lineWidth') ?? defaultOrderLineStyle.lineWidth
      const lineStyle = prop('lineStyle') ?? defaultOrderLineStyle.lineStyle
      const lineDashedValue = prop('lineDashedValue') ?? defaultOrderLineStyle.lineDashedValue

      // --- Section visibility ---
      const isBodyVisible = prop('isBodyVisible') !== false
      const isQuantityVisible = prop('isQuantityVisible') !== false
      const isCancelVisible = prop('isCancelButtonVisible') !== false

      // --- Shared label style builder ---
      // Uses klinecharts TextStyle property names: size, family, weight
      const labelStyle = (type: 'body' | 'quantity' | 'cancel-button'): Record<string, unknown> => {
        if (type === 'body') {
          return {
            style: 'stroke_fill',
            color: prop('bodyTextColor') ?? defaultOrderLineStyle.bodyTextColor,
            size: prop('bodyFontSize') ?? defaultOrderLineStyle.bodySize,
            family: prop('bodyFont') ?? defaultOrderLineStyle.bodyFont,
            weight: prop('bodyFontWeight') ?? defaultOrderLineStyle.bodyWeight,
            backgroundColor: prop('bodyBackgroundColor') ?? defaultOrderLineStyle.bodyBackgroundColor,
            borderColor: prop('bodyBorderColor') ?? defaultOrderLineStyle.bodyBorderColor,
            borderStyle,
            borderSize,
            borderDashedValue,
            borderRadius,
            paddingLeft: prop('bodyPaddingLeft') ?? defaultOrderLineStyle.bodyPaddingLeft,
            paddingRight: prop('bodyPaddingRight') ?? defaultOrderLineStyle.bodyPaddingRight,
            paddingTop: prop('bodyPaddingTop') ?? defaultOrderLineStyle.bodyPaddingTop,
            paddingBottom: prop('bodyPaddingBottom') ?? defaultOrderLineStyle.bodyPaddingBottom
          }
        }
        if (type === 'quantity') {
          return {
            style: 'stroke_fill',
            color: prop('quantityTextColor') ?? defaultOrderLineStyle.quantityTextColor,
            size: prop('quantityFontSize') ?? defaultOrderLineStyle.quantitySize,
            family: prop('quantityFont') ?? defaultOrderLineStyle.quantityFont,
            weight: prop('quantityFontWeight') ?? defaultOrderLineStyle.quantityWeight,
            backgroundColor: prop('quantityBackgroundColor') ?? defaultOrderLineStyle.quantityBackgroundColor,
            borderColor: prop('quantityBorderColor') ?? defaultOrderLineStyle.quantityBorderColor,
            borderStyle,
            borderSize,
            borderDashedValue,
            borderRadius,
            paddingLeft: prop('quantityPaddingLeft') ?? defaultOrderLineStyle.quantityPaddingLeft,
            paddingRight: prop('quantityPaddingRight') ?? defaultOrderLineStyle.quantityPaddingRight,
            paddingTop: prop('quantityPaddingTop') ?? defaultOrderLineStyle.quantityPaddingTop,
            paddingBottom: prop('quantityPaddingBottom') ?? defaultOrderLineStyle.quantityPaddingBottom
          }
        }
        // cancel-button
        return {
          style: 'stroke_fill',
          color: prop('cancelButtonIconColor') ?? defaultOrderLineStyle.cancelButtonIconColor,
          size: prop('cancelButtonFontSize') ?? defaultOrderLineStyle.cancelButtonSize,
          family: 'icomoon',
          weight: prop('cancelButtonFontWeight') ?? defaultOrderLineStyle.cancelButtonWeight,
          backgroundColor: prop('cancelButtonBackgroundColor') ?? defaultOrderLineStyle.cancelButtonBackgroundColor,
          borderColor: prop('cancelButtonBorderColor') ?? defaultOrderLineStyle.cancelButtonBorderColor,
          borderStyle,
          borderSize,
          borderDashedValue,
          borderRadius,
          paddingLeft: prop('cancelButtonPaddingLeft') ?? defaultOrderLineStyle.cancelButtonPaddingLeft,
          paddingRight: prop('cancelButtonPaddingRight') ?? defaultOrderLineStyle.cancelButtonPaddingRight,
          paddingTop: prop('cancelButtonPaddingTop') ?? defaultOrderLineStyle.cancelButtonPaddingTop,
          paddingBottom: prop('cancelButtonPaddingBottom') ?? defaultOrderLineStyle.cancelButtonPaddingBottom
        }
      }

      // --- Dynamic right-to-left margin calculation ---
      let currentMarginRight = marginRight - borderSize

      // Cancel button
      let cancelMarginRight = currentMarginRight
      if (isCancelVisible) {
        const cancelSt = labelStyle('cancel-button')
        const cancelPL = cancelSt.paddingLeft as number
        const cancelPR = cancelSt.paddingRight as number
        const cancelFS = cancelSt.size as number
        cancelMarginRight = calcTextWidth('\ue900', cancelFS, 'normal', 'icomoon') + cancelPL + cancelPR + currentMarginRight
        currentMarginRight = cancelMarginRight
      }

      // Quantity
      let quantityMarginRight = currentMarginRight
      const quantityText = String(prop('quantity') ?? 'Size')
      if (isQuantityVisible) {
        const qSt = labelStyle('quantity')
        const qPL = qSt.paddingLeft as number
        const qPR = qSt.paddingRight as number
        const qFS = qSt.size as number
        const qFF = qSt.family as string
        quantityMarginRight = calcTextWidth(quantityText, qFS, 'normal', qFF) + qPL + qPR + currentMarginRight
        currentMarginRight = quantityMarginRight
      }

      // Body
      let bodyMarginRight = currentMarginRight
      const bodyText = prop('text') ?? 'Position Line'
      if (isBodyVisible) {
        const bSt = labelStyle('body')
        const bPL = bSt.paddingLeft as number
        const bPR = bSt.paddingRight as number
        const bFS = bSt.size as number
        const bFF = bSt.family as string
        bodyMarginRight = calcTextWidth(bodyText, bFS, 'normal', bFF) + bPL + bPR + currentMarginRight
        currentMarginRight = bodyMarginRight
      }

      const lineMarginRight = currentMarginRight

      const lineStyles = {
        style: lineStyle,
        color: lineColor,
        size: lineWidth,
        dashedValue: lineDashedValue
      }

      // --- Left alignment ---
      if (align === 'left') {
        let cursor = Number(marginLeft)

        if (isBodyVisible) {
          const bSt = labelStyle('body')
          figures.push({ type: 'text', key: 'body', attrs: { x: cursor, y, text: bodyText, align: 'left', baseline: 'middle' }, styles: bSt })
          cursor += calcTextWidth(bodyText, bSt.size as number, 'normal', bSt.family as string) + (bSt.paddingLeft as number) + (bSt.paddingRight as number)
        }

        if (isQuantityVisible) {
          const qSt = labelStyle('quantity')
          figures.push({ type: 'text', key: 'quantity', attrs: { x: cursor, y, text: quantityText, align: 'left', baseline: 'middle' }, styles: qSt })
          cursor += calcTextWidth(quantityText, qSt.size as number, 'normal', qSt.family as string) + (qSt.paddingLeft as number) + (qSt.paddingRight as number)
        }

        if (isCancelVisible) {
          const cSt = labelStyle('cancel-button')
          figures.push({ type: 'text', key: 'cancel-button', attrs: { x: cursor, y, text: '\ue900', align: 'left', baseline: 'middle' }, styles: cSt })
          cursor += calcTextWidth('\ue900', cSt.size as number, 'normal', 'icomoon') + (cSt.paddingLeft as number) + (cSt.paddingRight as number)
        }

        // Price line left: from left edge to labels start
        if (Number(marginLeft) > 0) {
          figures.push({
            type: 'line', key: 'price-line-left',
            attrs: { coordinates: [{ x: 0, y }, { x: Number(marginLeft), y }] },
            styles: lineStyles, ignoreEvent: true
          })
        }

        // Price line right: from labels end to right edge
        figures.push({
          type: 'line', key: 'price-line-right',
          attrs: { coordinates: [{ x: cursor, y }, { x: bounding.width, y }] },
          styles: lineStyles, ignoreEvent: true
        })
      } else {
        // --- Right alignment (default) ---

        // Price line left: from left edge to labels start
        figures.push({
          type: 'line', key: 'price-line-left',
          attrs: { coordinates: [{ x: 0, y }, { x: bounding.width - lineMarginRight, y }] },
          styles: lineStyles, ignoreEvent: true
        })

        // Price line right: from labels end to right edge
        figures.push({
          type: 'line', key: 'price-line-right',
          attrs: { coordinates: [{ x: bounding.width - (marginRight - borderSize), y }, { x: bounding.width, y }] },
          styles: lineStyles, ignoreEvent: true
        })

        if (isBodyVisible) {
          figures.push({
            type: 'text', key: 'body',
            attrs: { x: bounding.width - bodyMarginRight, y, text: bodyText, align: 'left', baseline: 'middle' },
            styles: labelStyle('body')
          })
        }

        if (isQuantityVisible) {
          figures.push({
            type: 'text', key: 'quantity',
            attrs: { x: bounding.width - quantityMarginRight, y, text: quantityText, align: 'left', baseline: 'middle' },
            styles: labelStyle('quantity')
          })
        }

        if (isCancelVisible) {
          figures.push({
            type: 'text', key: 'cancel-button',
            attrs: { x: bounding.width - cancelMarginRight, y, text: '\ue900', align: 'left', baseline: 'middle' },
            styles: labelStyle('cancel-button')
          })
        }
      }

      return figures
    },

    // -----------------------------------------------------------------------
    // createYAxisFigures
    // -----------------------------------------------------------------------
    createYAxisFigures: ({ overlay, coordinates, chart }) => {
      const y = coordinates.length > 0 ? coordinates[0].y : 0

      const ext = (overlay.extendData != null && typeof overlay.extendData === 'object')
        ? overlay.extendData as DeepPartial<OrderLineProperties>
        : null
      _extRef.data = ext
      const price = ext?.price ?? properties.price ?? overlay.points[0]?.value

      let priceText = ''
      if (typeof overlay.extendData === 'function') {
        priceText = String((overlay.extendData as (v: unknown) => string)(price))
      } else if (price !== undefined) {
        const precision = chart.getSymbol()?.pricePrecision ?? 2
        priceText = Number(price).toFixed(precision)
      }

      const lineColor = prop('lineColor') ?? defaultOrderLineStyle.lineColor
      const bodyTextColor = prop('bodyTextColor') ?? defaultOrderLineStyle.bodyTextColor
      const bodySize = prop('bodyFontSize') ?? defaultOrderLineStyle.bodySize
      const bodyFont = prop('bodyFont') ?? defaultOrderLineStyle.bodyFont

      return [
        {
          type: 'text',
          attrs: { x: 0, y, text: priceText, align: 'left', baseline: 'middle' },
          styles: {
            style: 'fill',
            color: bodyTextColor,
            size: bodySize,
            family: bodyFont,
            backgroundColor: lineColor,
            borderColor: lineColor,
            paddingLeft: 4,
            paddingRight: 4,
            paddingTop: 2,
            paddingBottom: 2,
            borderRadius: 2
          }
        }
      ]
    },

    // -----------------------------------------------------------------------
    // Event handlers
    // -----------------------------------------------------------------------
    onSelected: ({ overlay }) => {
      overlay.mode = 'normal'
      return false
    },

    onRightClick: (event) => {
      // Prevent klinecharts from auto-deleting the overlay on right-click.
      // preventDefault is injected at runtime by OverlayView but not in the TS type.
      ;(event as unknown as { preventDefault?: () => void }).preventDefault?.()
      return false
    },

    onPressedMoveStart: (event) => {
      const ext = (event.overlay.extendData != null && typeof event.overlay.extendData === 'object')
        ? event.overlay.extendData as DeepPartial<OrderLineProperties>
        : null
      const listener = ext?.onMoveStart ?? properties.onMoveStart
      if (listener?.callback != null) {
        listener.callback(listener.params, event)
      }
      return false
    },

    onPressedMoving: (event) => {
      const points = event.overlay.points
      if (points.length > 0 && points[0].value !== undefined) {
        properties.price = points[0].value
      }
      const ext = (event.overlay.extendData != null && typeof event.overlay.extendData === 'object')
        ? event.overlay.extendData as DeepPartial<OrderLineProperties>
        : null
      const listener = ext?.onMove ?? properties.onMove
      if (listener?.callback != null) {
        listener.callback(listener.params, event)
      }
      return false
    },

    onPressedMoveEnd: (event) => {
      const ext = (event.overlay.extendData != null && typeof event.overlay.extendData === 'object')
        ? event.overlay.extendData as DeepPartial<OrderLineProperties>
        : null
      const listener = ext?.onMoveEnd ?? properties.onMoveEnd
      if (listener?.callback != null) {
        listener.callback(listener.params, event)
      }
      return false
    },

    onClick: (event) => {
      const ext = (event.overlay.extendData != null && typeof event.overlay.extendData === 'object')
        ? event.overlay.extendData as DeepPartial<OrderLineProperties>
        : null
      const figureKey = event.figure?.key
      if (figureKey === 'cancel-button') {
        const listener = ext?.onCancel ?? properties.onCancel
        if (listener?.callback != null) {
          listener.callback(listener.params, event)
        }
      } else if (figureKey === 'quantity') {
        const listener = ext?.onModify ?? properties.onModify
        if (listener?.callback != null) {
          listener.callback(listener.params, event)
        }
      }
      return false
    },

    // -----------------------------------------------------------------------
    // Property management
    // -----------------------------------------------------------------------
    setProperties: (_properties: DeepPartial<OrderLineProperties>, _id: string) => {
      const newProps = clone(properties) as Record<string, unknown>
      merge(newProps, _properties)
      properties = newProps as DeepPartial<OrderLineProperties>
    },

    getProperties: (_id: string): DeepPartial<OrderLineProperties> => properties
  }
}

export default orderLine
