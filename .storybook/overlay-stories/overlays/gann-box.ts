import type {Chart, Nullable} from "klinecharts"

type Point = {timestamp: number, value: number}

// gannBox: 2 points (totalStep 3) — box corners with Gann grid
export function createGannBox(chart: Chart, points: Point[]): Nullable<string> {
  return chart.createOverlay({
    name: "gannBox",
    points,
    lock: true,
  }) as Nullable<string>
}

export function removeGannBox(chart: Chart, id: string): void {
  chart.removeOverlay({id})
}
