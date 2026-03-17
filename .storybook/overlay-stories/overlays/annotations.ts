import type {Chart, Nullable} from "@superchart"

type Point = {timestamp: number, value: number}

export function createSimpleTag(chart: Chart, point: Point, text = "Tag"): Nullable<string> {
  return chart.createOverlay({
    name: "simpleTag",
    points: [point],
    extendData: text,
    lock: true,
  }) as Nullable<string>
}

export function createFreePath(chart: Chart, points: Point[]): Nullable<string> {
  return chart.createOverlay({
    name: "freePath",
    points,
    lock: true,
  }) as Nullable<string>
}

export function createBrush(chart: Chart, points: Point[]): Nullable<string> {
  return chart.createOverlay({
    name: "brush",
    points,
    lock: true,
  }) as Nullable<string>
}

export function removeAnnotation(chart: Chart, id: string): void {
  chart.removeOverlay({id})
}
