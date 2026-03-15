import type {Chart, Nullable} from "klinecharts"

type Point = {timestamp: number, value: number}

function createShapeOverlay(chart: Chart, name: string, points: Point[], color = "#1677FF"): Nullable<string> {
  return chart.createOverlay({
    name,
    points,
    lock: true,
  }) as Nullable<string>
}

// 2-point shapes (totalStep 3)
export function createArrow(chart: Chart, points: Point[]): Nullable<string> {
  return createShapeOverlay(chart, "arrow", points)
}
export function createCircle(chart: Chart, points: Point[]): Nullable<string> {
  return createShapeOverlay(chart, "circle", points)
}
export function createRect(chart: Chart, points: Point[]): Nullable<string> {
  return createShapeOverlay(chart, "rect", points)
}

// 3-point shapes (totalStep 4)
export function createTriangle(chart: Chart, points: Point[]): Nullable<string> {
  return createShapeOverlay(chart, "triangle", points)
}
export function createParallelogram(chart: Chart, points: Point[]): Nullable<string> {
  return createShapeOverlay(chart, "parallelogram", points)
}

export function removeShape(chart: Chart, id: string): void {
  chart.removeOverlay({id})
}
