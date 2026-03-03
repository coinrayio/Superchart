/**
 * Per-overlay-type property schemas
 *
 * Defines which OverlayProperties fields are relevant for each overlay type,
 * with UI metadata for rendering in the overlay settings modal.
 *
 * IMPORTANT: shapes (circle, rect, triangle, etc.) use borderColor/borderWidth/borderStyle
 * for their stroke — NOT lineColor/lineWidth/lineStyle. This is because klinecharts
 * renders shapes as PolygonStyle with border* properties.
 */

import type { OverlayProperties } from 'klinecharts'

export interface PropertyFieldSchema {
  key: keyof OverlayProperties
  label: string
  editor: 'color' | 'number' | 'select' | 'dashedValue'
  options?: string[]
  min?: number
  max?: number
  step?: number
}

export interface PropertySection {
  title: string
  fields: PropertyFieldSchema[]
}

export interface OverlayPropertySchema {
  sections: PropertySection[]
}

/**
 * Stroke property keys — determines which OverlayProperties control
 * the "primary stroke" for a given overlay type.
 *
 * Lines use lineColor/lineWidth/lineStyle.
 * Shapes use borderColor/borderWidth/borderStyle.
 */
export interface StrokeKeys {
  colorKey: keyof OverlayProperties
  widthKey: keyof OverlayProperties
  styleKey: keyof OverlayProperties
}

// ── Reusable field definitions ──

const lineColorField: PropertyFieldSchema = {
  key: 'lineColor', label: 'Color', editor: 'color',
}

const lineWidthField: PropertyFieldSchema = {
  key: 'lineWidth', label: 'Width', editor: 'number', min: 1, max: 10, step: 1,
}

const lineStyleField: PropertyFieldSchema = {
  key: 'lineStyle', label: 'Style', editor: 'select', options: ['solid', 'dashed'],
}

const lineDashedValueField: PropertyFieldSchema = {
  key: 'lineDashedValue', label: 'Dash pattern', editor: 'dashedValue', min: 1, max: 20, step: 1,
}

const backgroundColorField: PropertyFieldSchema = {
  key: 'backgroundColor', label: 'Fill color', editor: 'color',
}

const fillStyleField: PropertyFieldSchema = {
  key: 'style', label: 'Fill style', editor: 'select', options: ['stroke', 'fill', 'stroke_fill'],
}

const borderColorField: PropertyFieldSchema = {
  key: 'borderColor', label: 'Color', editor: 'color',
}

const borderWidthField: PropertyFieldSchema = {
  key: 'borderWidth', label: 'Width', editor: 'number', min: 0, max: 10, step: 1,
}

const borderStyleField: PropertyFieldSchema = {
  key: 'borderStyle', label: 'Style', editor: 'select', options: ['solid', 'dashed'],
}

const textColorField: PropertyFieldSchema = {
  key: 'textColor', label: 'Text color', editor: 'color',
}

const textFontSizeField: PropertyFieldSchema = {
  key: 'textFontSize', label: 'Font size', editor: 'number', min: 8, max: 48, step: 1,
}

const textBackgroundColorField: PropertyFieldSchema = {
  key: 'textBackgroundColor', label: 'Text background', editor: 'color',
}

const textFontField: PropertyFieldSchema = {
  key: 'textFont', label: 'Font family', editor: 'select',
  options: ['Helvetica Neue', 'Arial', 'Verdana', 'Courier New', 'Georgia', 'Times New Roman'],
}

const textFontWeightField: PropertyFieldSchema = {
  key: 'textFontWeight', label: 'Font weight', editor: 'select',
  options: ['normal', 'bold', 'lighter'],
}

// ── Section presets ──

const lineSection: PropertySection = {
  title: 'Line',
  fields: [lineColorField, lineWidthField, lineStyleField, lineDashedValueField],
}

// Shape stroke section — uses border* properties (what klinecharts PolygonStyle reads)
const shapeStrokeSection: PropertySection = {
  title: 'Stroke',
  fields: [borderColorField, borderWidthField, borderStyleField, lineDashedValueField],
}

const shapeFillSection: PropertySection = {
  title: 'Fill',
  fields: [fillStyleField, backgroundColorField],
}

const textSection: PropertySection = {
  title: 'Text',
  fields: [textColorField, textFontSizeField, textFontField, textFontWeightField, textBackgroundColorField],
}

const textMinimalSection: PropertySection = {
  title: 'Text',
  fields: [textColorField, textFontSizeField],
}

// ── Schema definitions by overlay category ──

const lineOnlySchema: OverlayPropertySchema = {
  sections: [lineSection],
}

// Shapes: stroke uses borderColor/borderWidth/borderStyle (PolygonStyle)
const shapeSchema: OverlayPropertySchema = {
  sections: [shapeStrokeSection, shapeFillSection],
}

const annotationSchema: OverlayPropertySchema = {
  sections: [lineSection, textSection],
}

const waveSchema: OverlayPropertySchema = {
  sections: [lineSection, textMinimalSection],
}

const fibonacciSchema: OverlayPropertySchema = {
  sections: [
    lineSection,
    textMinimalSection,
    { title: 'Fill', fields: [backgroundColorField] },
  ],
}

const gannSchema: OverlayPropertySchema = {
  sections: [lineSection, { title: 'Fill', fields: [backgroundColorField] }, textMinimalSection],
}

// Arrow: uses lineColor/lineWidth/lineStyle (LineStyle), arrowhead inherits lineColor
const arrowSchema: OverlayPropertySchema = {
  sections: [
    { title: 'Line', fields: [lineColorField, lineWidthField, lineStyleField, lineDashedValueField] },
    { title: 'Fill', fields: [backgroundColorField] },
  ],
}

const brushSchema: OverlayPropertySchema = {
  sections: [{ title: 'Line', fields: [lineColorField, lineWidthField] }],
}

// ── Overlay name → schema mapping ──

const OVERLAY_SCHEMA_MAP: Record<string, OverlayPropertySchema> = {
  // Lines
  straightLine: lineOnlySchema,
  rayLine: lineOnlySchema,
  segment: lineOnlySchema,
  horizontalStraightLine: lineOnlySchema,
  horizontalRayLine: lineOnlySchema,
  horizontalSegment: lineOnlySchema,
  verticalStraightLine: lineOnlySchema,
  verticalRayLine: lineOnlySchema,
  verticalSegment: lineOnlySchema,
  priceLine: lineOnlySchema,
  // Channels
  parallelStraightLine: lineOnlySchema,
  priceChannelLine: lineOnlySchema,
  // Fibonacci (line-only variant)
  fibonacciLine: lineOnlySchema,
  // Shapes — use border* properties for stroke
  rect: shapeSchema,
  circle: shapeSchema,
  triangle: shapeSchema,
  parallelogram: shapeSchema,
  arc: shapeSchema,
  // Arrow — uses line* properties
  arrow: arrowSchema,
  // Brush
  brush: brushSchema,
  // Annotations
  simpleAnnotation: annotationSchema,
  simpleTag: annotationSchema,
  // Waves
  threeWaves: waveSchema,
  fiveWaves: waveSchema,
  eightWaves: waveSchema,
  anyWaves: waveSchema,
  abcd: waveSchema,
  xabcd: waveSchema,
  // Fibonacci (extended)
  fibonacciSegment: fibonacciSchema,
  fibonacciCircle: fibonacciSchema,
  fibonacciSpiral: fibonacciSchema,
  fibonacciSpeedResistanceFan: fibonacciSchema,
  fibonacciExtension: fibonacciSchema,
  // Gann
  gannBox: gannSchema,
}

// Fallback for unknown overlay types
const defaultSchema: OverlayPropertySchema = {
  sections: [lineSection, shapeFillSection, textSection],
}

/**
 * Get the property schema for an overlay type.
 * Returns which OverlayProperties fields are editable and how to render them.
 */
export function getOverlayPropertySchema(overlayName: string): OverlayPropertySchema {
  return OVERLAY_SCHEMA_MAP[overlayName] ?? defaultSchema
}

/**
 * Check if an overlay type's schema includes a specific property field.
 */
export function schemaHasField(overlayName: string, fieldKey: keyof OverlayProperties): boolean {
  const schema = getOverlayPropertySchema(overlayName)
  return schema.sections.some(s => s.fields.some(f => f.key === fieldKey))
}

/**
 * Get the property keys that control the "primary stroke" for an overlay type.
 *
 * Shapes use borderColor/borderWidth/borderStyle (PolygonStyle).
 * Lines/arrows/waves use lineColor/lineWidth/lineStyle (LineStyle).
 */
export function getStrokeKeys(overlayName: string): StrokeKeys {
  // If schema has borderColor but NOT lineColor, it's a shape-style overlay
  const hasBorder = schemaHasField(overlayName, 'borderColor')
  const hasLine = schemaHasField(overlayName, 'lineColor')

  if (hasBorder && !hasLine) {
    return { colorKey: 'borderColor', widthKey: 'borderWidth', styleKey: 'borderStyle' }
  }
  return { colorKey: 'lineColor', widthKey: 'lineWidth', styleKey: 'lineStyle' }
}

/**
 * Line style presets for the floating bar.
 * Maps user-friendly names to property values.
 */
export type LineStylePreset = 'solid' | 'dashed' | 'dotted'

export const LINE_STYLE_PRESETS: Record<LineStylePreset, { style: string; dashedValue: number[] }> = {
  solid: { style: 'solid', dashedValue: [2, 2] },
  dashed: { style: 'dashed', dashedValue: [5, 2] },
  dotted: { style: 'dashed', dashedValue: [1.5, 2.5] },
}

/**
 * Determine the line style preset from property values.
 */
export function getLineStylePreset(style: string | undefined, dashedValue?: number[]): LineStylePreset {
  if (!style || style === 'solid') return 'solid'
  // It's dashed — determine if it's "dashed" or "dotted" based on dash size
  if (dashedValue && dashedValue[0] <= 2) return 'dotted'
  return 'dashed'
}

/**
 * Extract OverlayProperties from klinecharts overlay.styles (reverse of overlayPropertiesToKlineStyles).
 * Used by the settings modal to read current values from standard overlays.
 */
export function klineStylesToOverlayProperties(
  styles: Record<string, unknown> | undefined
): Partial<OverlayProperties> {
  if (!styles) return {}
  const props: Record<string, unknown> = {}

  const line = styles.line as Record<string, unknown> | undefined
  if (line) {
    if (line.color !== undefined) props.lineColor = line.color
    if (line.size !== undefined) props.lineWidth = line.size
    if (line.style !== undefined) props.lineStyle = line.style
    if (line.dashedValue !== undefined) props.lineDashedValue = line.dashedValue
  }

  // Read from polygon (shapes use polygon styles)
  const polygon = styles.polygon as Record<string, unknown> | undefined
  if (polygon) {
    if (polygon.color !== undefined) props.backgroundColor = polygon.color
    if (polygon.borderColor !== undefined) props.borderColor = polygon.borderColor
    if (polygon.borderSize !== undefined) props.borderWidth = polygon.borderSize
    if (polygon.style !== undefined) props.style = polygon.style
    if (polygon.borderStyle !== undefined) props.borderStyle = polygon.borderStyle
  }

  const text = styles.text as Record<string, unknown> | undefined
  if (text) {
    if (text.color !== undefined) props.textColor = text.color
    if (text.size !== undefined) props.textFontSize = text.size
    if (text.family !== undefined) props.textFont = text.family
    if (text.weight !== undefined) props.textFontWeight = text.weight
    if (text.backgroundColor !== undefined) props.textBackgroundColor = text.backgroundColor
  }

  return props as Partial<OverlayProperties>
}

/**
 * Convert OverlayProperties to klinecharts OverlayStyle format.
 *
 * Standard overlays (straightLine, horizontalStraightLine, etc.) don't have
 * ProOverlay's setProperties/getProperties. They read from klinecharts'
 * overlay.styles (OverlayStyle) instead. This function bridges the gap.
 */
export function overlayPropertiesToKlineStyles(
  props: Partial<OverlayProperties>
): Record<string, unknown> {
  const styles: Record<string, unknown> = {}

  // Line styles → overlay.styles.line
  const lineStyle: Record<string, unknown> = {}
  if (props.lineColor !== undefined) lineStyle.color = props.lineColor
  if (props.lineWidth !== undefined) lineStyle.size = props.lineWidth
  if (props.lineStyle !== undefined) lineStyle.style = props.lineStyle
  if (props.lineDashedValue !== undefined) lineStyle.dashedValue = props.lineDashedValue
  if (Object.keys(lineStyle).length > 0) styles.line = lineStyle

  // Shape styles → overlay.styles.polygon / circle / rect
  const shapeStyle: Record<string, unknown> = {}
  if (props.backgroundColor !== undefined) shapeStyle.color = props.backgroundColor
  if (props.borderColor !== undefined) shapeStyle.borderColor = props.borderColor
  if (props.borderWidth !== undefined) shapeStyle.borderSize = props.borderWidth
  if (props.style !== undefined) shapeStyle.style = props.style
  if (props.borderStyle !== undefined) shapeStyle.borderStyle = props.borderStyle
  if (Object.keys(shapeStyle).length > 0) {
    styles.polygon = { ...shapeStyle }
    styles.circle = { ...shapeStyle }
    styles.rect = { ...shapeStyle }
  }

  // Text styles → overlay.styles.text
  const textStyle: Record<string, unknown> = {}
  if (props.textColor !== undefined) textStyle.color = props.textColor
  if (props.textFontSize !== undefined) textStyle.size = props.textFontSize
  if (props.textFont !== undefined) textStyle.family = props.textFont
  if (props.textFontWeight !== undefined) textStyle.weight = props.textFontWeight
  if (props.textBackgroundColor !== undefined) textStyle.backgroundColor = props.textBackgroundColor
  if (props.textPaddingLeft !== undefined) textStyle.paddingLeft = props.textPaddingLeft
  if (props.textPaddingRight !== undefined) textStyle.paddingRight = props.textPaddingRight
  if (props.textPaddingTop !== undefined) textStyle.paddingTop = props.textPaddingTop
  if (props.textPaddingBottom !== undefined) textStyle.paddingBottom = props.textPaddingBottom
  if (Object.keys(textStyle).length > 0) styles.text = textStyle

  return styles
}
