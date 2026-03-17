import type {Chart, Nullable} from "@superchart"

type Point = {timestamp: number, value: number}

function createLineOverlay(chart: Chart, name: string, points: Point[], color = "#1677FF"): Nullable<string> {
  return chart.createOverlay({
    name,
    points,
    styles: {
      line: {color, size: 1, style: "solid"},
    },
    lock: true,
  }) as Nullable<string>
}

// 2-point lines (totalStep 3)
export function createSegment(chart: Chart, points: Point[], color?: string): Nullable<string> {
  return createLineOverlay(chart, "segment", points, color)
}
export function createRayLine(chart: Chart, points: Point[], color?: string): Nullable<string> {
  return createLineOverlay(chart, "rayLine", points, color)
}
export function createStraightLine(chart: Chart, points: Point[], color?: string): Nullable<string> {
  return createLineOverlay(chart, "straightLine", points, color)
}

// Horizontal lines
export function createHorizontalStraightLine(chart: Chart, price: number, color?: string): Nullable<string> {
  return createLineOverlay(chart, "horizontalStraightLine", [{timestamp: 0, value: price}], color)
}
export function createHorizontalRayLine(chart: Chart, points: Point[], color?: string): Nullable<string> {
  return createLineOverlay(chart, "horizontalRayLine", points, color)
}
export function createHorizontalSegment(chart: Chart, points: Point[], color?: string): Nullable<string> {
  return createLineOverlay(chart, "horizontalSegment", points, color)
}

// Vertical lines
export function createVerticalStraightLine(chart: Chart, timestamp: number, color?: string): Nullable<string> {
  return createLineOverlay(chart, "verticalStraightLine", [{timestamp, value: 0}], color)
}
export function createVerticalRayLine(chart: Chart, points: Point[], color?: string): Nullable<string> {
  return createLineOverlay(chart, "verticalRayLine", points, color)
}
export function createVerticalSegment(chart: Chart, points: Point[], color?: string): Nullable<string> {
  return createLineOverlay(chart, "verticalSegment", points, color)
}

// 3-point lines (totalStep 4)
export function createParallelStraightLine(chart: Chart, points: Point[], color?: string): Nullable<string> {
  return createLineOverlay(chart, "parallelStraightLine", points, color)
}
export function createPriceChannelLine(chart: Chart, points: Point[], color?: string): Nullable<string> {
  return createLineOverlay(chart, "priceChannelLine", points, color)
}

export function removeOverlay(chart: Chart, id: string): void {
  chart.removeOverlay({id})
}
