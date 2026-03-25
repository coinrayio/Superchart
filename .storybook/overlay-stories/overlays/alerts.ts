import type {Chart, Nullable, OverlayEvent} from "@superchart"

export interface TimeAlertLineOptions {
  color?: string
  lineWidth?: number
  lineStyle?: "solid" | "dashed"
  text?: string
  textColor?: string
  textBackgroundColor?: string
  textFontSize?: number
  lock?: boolean
  onPressedMoveStart?: (event: OverlayEvent) => boolean | void
  onPressedMoving?: (event: OverlayEvent) => boolean | void
  onPressedMoveEnd?: (event: OverlayEvent) => boolean | void
  onSelected?: (event: OverlayEvent) => boolean | void
  onDeselected?: (event: OverlayEvent) => boolean | void
  onClick?: (event: OverlayEvent) => boolean | void
  onRightClick?: (event: OverlayEvent) => boolean | void
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

  return chart.createOverlay({
    name: "verticalStraightLine",
    points: [{timestamp, value: 0}],
    styles: {
      line: {color, size: lineWidth, style: lineStyle},
      text: {color: textColor, backgroundColor: textBackgroundColor, size: textFontSize},
    },
    extendData: text,
    lock,
    ...callbacks,
  }) as Nullable<string>
}

// Trendline alert (segment with two draggable points, callbacks)
type Point = {timestamp: number, value: number}

export interface TrendlineAlertLineOptions {
  color?: string
  lineWidth?: number
  lineStyle?: "solid" | "dashed"
  lock?: boolean
  onPressedMoveStart?: (event: OverlayEvent) => boolean | void
  onPressedMoving?: (event: OverlayEvent) => boolean | void
  onPressedMoveEnd?: (event: OverlayEvent) => boolean | void
  onSelected?: (event: OverlayEvent) => boolean | void
  onDeselected?: (event: OverlayEvent) => boolean | void
  onClick?: (event: OverlayEvent) => boolean | void
  onRightClick?: (event: OverlayEvent) => boolean | void
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
    lock = false,
    ...callbacks
  } = options

  return chart.createOverlay({
    name: "segment",
    points,
    styles: {
      line: {color, size: lineWidth, style: lineStyle},
    },
    lock,
    ...callbacks,
  }) as Nullable<string>
}

export function removeOverlay(chart: Chart, id: string): void {
  chart.removeOverlay({id})
}
