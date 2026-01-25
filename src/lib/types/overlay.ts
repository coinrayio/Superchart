/**
 * Overlay types - extends base klinecharts overlay types
 *
 * Import overlay types from coinray-chart and only add extensions.
 */

// Re-export base overlay types from coinray-chart
export type {
  Overlay,
  OverlayCreate,
  OverlayTemplate,
  OverlayMode,
  OverlayFigure,
  OverlayEvent,
  OverlayFilter,
  OverlayStyle,
} from 'klinecharts'

import type {
  DeepPartial,
  LineType,
  PolygonType,
  Overlay,
  OverlayCreate,
  OverlayTemplate,
  OverlayEvent,
  Point,
} from 'klinecharts'

/**
 * Extended overlay properties for styling (following coinray-chart-ui pattern)
 */
export interface OverlayProperties {
  style: PolygonType
  text: string
  textColor: string
  textFont: string
  textFontSize: number
  textFontWeight: number | string
  textBackgroundColor: string
  textPaddingLeft: number
  textPaddingRight: number
  textPaddingTop: number
  textPaddingBottom: number
  lineColor: string
  lineWidth: number
  lineStyle: LineType
  lineLength: number
  lineDashedValue: number[]
  tooltip: string
  backgroundColor: string
  borderStyle: LineType
  borderColor: string
  borderWidth: number
}

/**
 * Extended overlay with property management
 */
export type ProOverlay = Overlay & {
  setProperties: (properties: DeepPartial<OverlayProperties>, id: string) => void
  getProperties: (id: string) => DeepPartial<OverlayProperties>
}

/**
 * Extended overlay create with properties
 */
export type ProOverlayCreate = OverlayCreate & {
  properties?: DeepPartial<OverlayProperties>
}

/**
 * Extended overlay template with property management
 */
export interface ProOverlayTemplate extends OverlayTemplate {
  setProperties?: (properties: DeepPartial<OverlayProperties>, id: string) => void
  getProperties?: (id: string) => DeepPartial<OverlayProperties>
}

/**
 * Overlay event listener params (for callbacks)
 */
export interface OverlayEventListenerParams {
  params: unknown
  callback: (params: unknown, event?: OverlayEvent<unknown>) => void
}

/**
 * Overlay point for storage (timestamp + value rather than dataIndex)
 */
export interface SavedOverlayPoint {
  timestamp: number
  value: number
}

/**
 * Saved overlay state for persistence
 * Uses string for name to allow custom overlays
 */
export interface SavedOverlay {
  id: string
  /** Overlay type name - string to allow custom overlays */
  name: string
  paneId: string
  groupId?: string
  points: SavedOverlayPoint[]
  properties?: DeepPartial<OverlayProperties>
  lock: boolean
  visible: boolean
  extendLeft?: boolean
  extendRight?: boolean
  mode?: import('klinecharts').OverlayMode
  extendData?: unknown
}

/**
 * Built-in overlay names (for reference, but users can create custom ones)
 */
export const BUILT_IN_OVERLAYS = [
  // Lines
  'horizontalStraightLine',
  'verticalStraightLine',
  'straightLine',
  'rayLine',
  'segment',
  'priceLine',
  // Channels
  'parallelStraightLine',
  'priceChannelLine',
  // Fibonacci
  'fibonacciLine',
  'fibonacciSegment',
  'fibonacciCircle',
  'fibonacciSpiral',
  'fibonacciSpeedResistanceFan',
  'fibonacciExtension',
  // Shapes
  'rect',
  'circle',
  'triangle',
  'parallelogram',
  'arc',
  // Annotations
  'simpleAnnotation',
  'simpleTag',
  // Waves
  'wave',
  'abcd',
  'xabcd',
] as const

/**
 * Overlay category for UI grouping
 */
export interface OverlayCategory {
  id: string
  name: string
  icon?: string
  /** Overlay names in this category */
  overlays: string[]
}

/**
 * Default overlay categories for the drawing bar
 */
export const OVERLAY_CATEGORIES: OverlayCategory[] = [
  {
    id: 'lines',
    name: 'Lines',
    overlays: ['horizontalStraightLine', 'verticalStraightLine', 'straightLine', 'rayLine', 'segment', 'priceLine'],
  },
  {
    id: 'channels',
    name: 'Channels',
    overlays: ['parallelStraightLine', 'priceChannelLine'],
  },
  {
    id: 'fibonacci',
    name: 'Fibonacci',
    overlays: ['fibonacciLine', 'fibonacciSegment', 'fibonacciCircle', 'fibonacciSpiral', 'fibonacciSpeedResistanceFan', 'fibonacciExtension'],
  },
  {
    id: 'shapes',
    name: 'Shapes',
    overlays: ['rect', 'circle', 'triangle', 'parallelogram', 'arc'],
  },
  {
    id: 'annotations',
    name: 'Annotations',
    overlays: ['simpleAnnotation', 'simpleTag'],
  },
  {
    id: 'waves',
    name: 'Waves',
    overlays: ['wave', 'abcd', 'xabcd'],
  },
]

/**
 * Convert overlay points to saved format (using timestamps)
 */
export function overlayPointsToSaved(points: Array<Partial<Point>>): SavedOverlayPoint[] {
  return points
    .filter((p): p is Point => p.timestamp !== undefined && p.value !== undefined)
    .map(p => ({
      timestamp: p.timestamp,
      value: p.value,
    }))
}
