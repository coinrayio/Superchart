import type {Chart, Nullable, OverlayEvent} from "@superchart"

// ---------------------------------------------------------------------------
// Time Alert — vertical line with text label
// ---------------------------------------------------------------------------

export interface TimeAlertLineOptions {
  color?: string
  lineWidth?: number
  lineStyle?: "solid" | "dashed"
  text?: string
  textColor?: string
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
    textFontSize = 12,
    lock = false,
    ...callbacks
  } = options

  const id = chart.createOverlay({
    name: "timeAlertLine",
    points: [{timestamp, value: 0}],
    lock,
    extendData: {
      lineColor: color, lineWidth, lineStyle,
      text, textColor, textFontSize,
    },
    ...callbacks,
  }) as Nullable<string>
  return id
}

// ---------------------------------------------------------------------------
// Trendline Alert — segment with text label (bell + label at midpoint)
// ---------------------------------------------------------------------------

type Point = {timestamp: number, value: number}

export interface TrendlineAlertLineOptions {
  color?: string
  lineWidth?: number
  lineStyle?: "solid" | "dashed"
  text?: string
  textColor?: string
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
    textFontSize = 12,
    lock = false,
    ...callbacks
  } = options

  const id = chart.createOverlay({
    name: "trendlineAlertLine",
    points,
    lock,
    extendData: {
      lineColor: color, lineWidth, lineStyle,
      text, textColor, textFontSize,
    },
    ...callbacks,
  }) as Nullable<string>
  return id
}

// ---------------------------------------------------------------------------
// Triggered Price Alert — bell emoji at timestamp/price
// ---------------------------------------------------------------------------

export interface TriggeredPriceAlertOptions {
  color?: string
  fontSize?: number
}

export function createTriggeredPriceAlert(
  chart: Chart,
  timestamp: number,
  price: number,
  options: TriggeredPriceAlertOptions = {},
): Nullable<string> {
  const {color = "#00BFFF", fontSize = 20} = options

  const id = chart.createOverlay({
    name: "emojiMarker",
    points: [{timestamp, value: price}],
    lock: true,
    visible: true,
    extendData: {text: "🔔", fontSize, color},
    paneId: "candle_pane",
  }) as Nullable<string>
  return id
}

export function removeAllTriggeredAlerts(chart: Chart): void {
  chart.removeOverlay({name: "emojiMarker"})
}

export function removeOverlay(chart: Chart, id: string): void {
  chart.removeOverlay({id})
}
