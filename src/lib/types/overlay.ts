/**
 * Overlay types - extends base klinecharts overlay types
 *
 * Core overlay types are now in coinray-chart. This file only contains
 * superchart-specific types for persistence and UI organization.
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
  // Pro overlay types from coinray-chart
  OverlayProperties,
  ProOverlayTemplate,
  OverlayPropertiesStore,
  OrderLineProperties,
  OrderLine,
  OrderLineStyle,
  OrderLineEventListener,
} from 'klinecharts'

// Re-export pro overlay utilities from coinray-chart
export {
  createOrderLine,
  isProOverlayTemplate,
  createPropertiesStore,
  DEFAULT_OVERLAY_PROPERTIES,
} from 'klinecharts'

import type { DeepPartial, Point, OverlayProperties, Overlay, OverlayCreate } from 'klinecharts'

/**
 * ProOverlay - An overlay with property management methods
 * Created by ProOverlayTemplate factories
 */
export interface ProOverlay extends Overlay {
  setProperties(properties: DeepPartial<OverlayProperties>, id: string): void
  getProperties(id: string): DeepPartial<OverlayProperties>
}

/**
 * ProOverlayCreate - Create options for a ProOverlay
 */
export interface ProOverlayCreate extends OverlayCreate {
  properties?: DeepPartial<OverlayProperties>
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
  'arrow',
  'brush',
  // Annotations
  'simpleAnnotation',
  'simpleTag',
  // Waves
  'threeWaves',
  'fiveWaves',
  'eightWaves',
  'anyWaves',
  'abcd',
  'xabcd',
  // Gann
  'gannBox',
  // Order line
  'orderLine',
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
    overlays: ['rect', 'circle', 'triangle', 'parallelogram', 'arc', 'arrow', 'brush'],
  },
  {
    id: 'annotations',
    name: 'Annotations',
    overlays: ['simpleAnnotation', 'simpleTag'],
  },
  {
    id: 'waves',
    name: 'Waves',
    overlays: ['threeWaves', 'fiveWaves', 'eightWaves', 'anyWaves', 'abcd', 'xabcd'],
  },
  {
    id: 'gann',
    name: 'Gann',
    overlays: ['gannBox'],
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
