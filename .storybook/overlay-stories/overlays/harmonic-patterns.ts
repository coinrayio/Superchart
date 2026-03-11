import type {Chart, Nullable} from "klinecharts"

type Point = {timestamp: number, value: number}

// abcd: 4 points (totalStep 5) — labeled (A),(B),(C),(D)
export function createAbcd(chart: Chart, points: Point[]): Nullable<string> {
  return chart.createOverlay({
    name: "abcd",
    points,
    lock: true,
  }) as Nullable<string>
}

// xabcd: 5 points (totalStep 6) — labeled (X),(A),(B),(C),(D)
export function createXabcd(chart: Chart, points: Point[]): Nullable<string> {
  return chart.createOverlay({
    name: "xabcd",
    points,
    lock: true,
  }) as Nullable<string>
}

export function removeHarmonic(chart: Chart, id: string): void {
  chart.removeOverlay({id})
}
