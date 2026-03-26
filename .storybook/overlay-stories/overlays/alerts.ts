import type {Chart, Nullable, Overlay, OverlayEvent, TradeLine, TradeLineProperties} from "@superchart"
import {createTradeLine} from "@superchart"

// Workaround: segment and verticalStraightLine don't respect styles.line.* passed via
// createOverlay. Use setProperties after creation to apply line colors/styles.
// Remove this when SC natively supports styles on Pro overlays.
function applyProperties(chart: Chart, id: string, props: Record<string, unknown>): void {
  const overlay = chart.getOverlays({id})[0] as Overlay & {setProperties?: (p: Record<string, unknown>, id: string) => void}
  if (overlay?.setProperties) overlay.setProperties(props, id)
}

export interface TimeAlertLineOptions {
  color?: string
  lineWidth?: number
  lineStyle?: "solid" | "dashed"
  text?: string
  textColor?: string
  textBackgroundColor?: string
  textFontSize?: number
  lock?: boolean
  onPressedMoveStart?: (event: OverlayEvent<unknown>) => boolean | void
  onPressedMoving?: (event: OverlayEvent<unknown>) => boolean | void
  onPressedMoveEnd?: (event: OverlayEvent<unknown>) => boolean | void
  onSelected?: (event: OverlayEvent<unknown>) => boolean | void
  onDeselected?: (event: OverlayEvent<unknown>) => boolean | void
  onClick?: (event: OverlayEvent<unknown>) => boolean | void
  onRightClick?: (event: OverlayEvent<unknown>) => boolean | void
}

export function createTimeAlertLine(
  chart: Chart,
  timestamp: number,
  options: TimeAlertLineOptions = {},
): Nullable<string> {
  const {
    color = "#3ea6ff",
    lineWidth = 1,
    lineStyle = "solid",
    text,
    textColor = "#FFFFFF",
    textBackgroundColor = "#3ea6ff",
    textFontSize = 12,
    lock = false,
    ...callbacks
  } = options

  const id = chart.createOverlay({
    name: "verticalStraightLine",
    points: [{timestamp, value: 0}],
    lock,
    ...callbacks,
  }) as Nullable<string>
  if (id) applyProperties(chart, id, {lineColor: color, lineWidth, lineStyle})
  return id
}

// Trendline alert (segment with two draggable points, callbacks)
type Point = {timestamp: number, value: number}

export interface TrendlineAlertLineOptions {
  color?: string
  lineWidth?: number
  lineStyle?: "solid" | "dashed"
  text?: string
  textColor?: string
  textBackgroundColor?: string
  textFontSize?: number
  lock?: boolean
  onPressedMoveStart?: (event: OverlayEvent<unknown>) => boolean | void
  onPressedMoving?: (event: OverlayEvent<unknown>) => boolean | void
  onPressedMoveEnd?: (event: OverlayEvent<unknown>) => boolean | void
  onSelected?: (event: OverlayEvent<unknown>) => boolean | void
  onDeselected?: (event: OverlayEvent<unknown>) => boolean | void
  onClick?: (event: OverlayEvent<unknown>) => boolean | void
  onRightClick?: (event: OverlayEvent<unknown>) => boolean | void
}

export function createTrendlineAlertLine(
  chart: Chart,
  points: [Point, Point],
  options: TrendlineAlertLineOptions = {},
): Nullable<string> {
  const {
    color = "#3ea6ff",
    lineWidth = 1,
    lineStyle = "solid",
    text,
    textColor = "#FFFFFF",
    textBackgroundColor = "#3ea6ff",
    textFontSize = 12,
    lock = false,
    ...callbacks
  } = options

  const id = chart.createOverlay({
    name: "segment",
    points,
    lock,
    ...callbacks,
  }) as Nullable<string>
  if (id) applyProperties(chart, id, {lineColor: color, lineWidth, lineStyle})
  return id
}

// Triggered price alert (tradeLine arrow marker — matches chart-controller.createTriggeredAlert)
export interface TriggeredPriceAlertOptions {
  color?: string
}

export function createTriggeredPriceAlert(
  chart: Chart,
  timestamp: number,
  price: number,
  options: TriggeredPriceAlertOptions = {},
): Nullable<TradeLine> {
  const {color = "#00BFFF"} = options

  const props: Partial<TradeLineProperties> = {
    direction: "up",
    arrowType: "wide",
    color,
    text: "",
    gap: 4,
    timestamp,
    price,
  }

  return createTradeLine(chart, props)
}

export function removeAllTriggeredAlerts(chart: Chart): void {
  chart.removeOverlay({name: "tradeLine"})
}

export function removeOverlay(chart: Chart, id: string): void {
  chart.removeOverlay({id})
}
