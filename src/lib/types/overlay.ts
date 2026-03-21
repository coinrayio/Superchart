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
  FigureLevel,
} from 'klinecharts'

// Order line types (from Superchart extension)
export type {
  OrderLineProperties,
  OrderLine,
  OrderLineStyle,
  OrderLineEventListener,
} from '../extension/orderLineApi'

// Re-export pro overlay utilities from coinray-chart
export {
  isProOverlayTemplate,
  createPropertiesStore,
  DEFAULT_OVERLAY_PROPERTIES,
} from 'klinecharts'

// Order line factory (from Superchart extension)
export { createOrderLine } from '../extension/orderLineApi'

import type { DeepPartial, Point, OverlayProperties, Overlay, OverlayCreate, PeriodType } from 'klinecharts'

// ── Timeframe visibility ──

/** Period categories for visibility rules (excludes 'year' since charts rarely use it) */
export type PeriodCategory = Exclude<PeriodType, 'year'>

export const PERIOD_CATEGORIES: PeriodCategory[] = ['second', 'minute', 'hour', 'day', 'week', 'month']

/** Available span values per period category (common trading timeframes) */
export const TIMEFRAME_SPANS: Record<PeriodCategory, number[]> = {
  second: [1, 5, 10, 15, 30, 45],
  minute: [1, 2, 3, 5, 10, 15, 30, 45],
  hour: [1, 2, 3, 4],
  day: [1, 2, 3],
  week: [1],
  month: [1, 2, 3, 6, 12],
}

/** Category display labels */
export const PERIOD_CATEGORY_LABELS: Record<PeriodCategory, string> = {
  second: 'Seconds',
  minute: 'Minutes',
  hour: 'Hours',
  day: 'Days',
  week: 'Weeks',
  month: 'Months',
}

/** Suffix for formatting span display (e.g., 1s, 5m, 1D) */
const PERIOD_SUFFIXES: Record<PeriodCategory, string> = {
  second: 's', minute: 'm', hour: 'h', day: 'D', week: 'W', month: 'M',
}

export function formatSpan(category: PeriodCategory, span: number): string {
  return `${span}${PERIOD_SUFFIXES[category]}`
}

export interface TimeframeVisibilityRule {
  enabled: boolean
  from: number
  to: number
}

export interface TimeframeVisibility {
  showOnAll: boolean
  rules: Record<PeriodCategory, TimeframeVisibilityRule>
}

export function defaultTimeframeVisibility(): TimeframeVisibility {
  return {
    showOnAll: true,
    rules: {
      second: { enabled: true, from: 1, to: 45 },
      minute: { enabled: true, from: 1, to: 45 },
      hour: { enabled: true, from: 1, to: 4 },
      day: { enabled: true, from: 1, to: 3 },
      week: { enabled: true, from: 1, to: 1 },
      month: { enabled: true, from: 1, to: 12 },
    },
  }
}

/** Check if an overlay should be visible for the given period */
export function isOverlayVisibleForPeriod(
  visibility: TimeframeVisibility | undefined,
  period: { type: string; span: number }
): boolean {
  if (!visibility || visibility.showOnAll) return true
  const category = period.type as PeriodCategory
  if (!(category in visibility.rules)) return true // unknown category = visible
  const rule = visibility.rules[category]
  if (!rule || !rule.enabled) return false
  return period.span >= rule.from && period.span <= rule.to
}

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
  figureStyles?: Record<string, Record<string, unknown>>
  lock: boolean
  visible: boolean
  extendLeft?: boolean
  extendRight?: boolean
  mode?: import('klinecharts').OverlayMode
  extendData?: unknown
  timeframeVisibility?: TimeframeVisibility
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
