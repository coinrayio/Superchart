import type {Chart, Nullable} from "klinecharts"

type Point = {timestamp: number, value: number}

function createFibOverlay(chart: Chart, name: string, points: Point[]): Nullable<string> {
  return chart.createOverlay({
    name,
    points,
    lock: true,
  }) as Nullable<string>
}

// 2-point fibonacci overlays (totalStep 3)
export function createFibonacciLine(chart: Chart, points: Point[]): Nullable<string> {
  return createFibOverlay(chart, "fibonacciLine", points)
}
export function createFibonacciCircle(chart: Chart, points: Point[]): Nullable<string> {
  return createFibOverlay(chart, "fibonacciCircle", points)
}
export function createFibonacciSegment(chart: Chart, points: Point[]): Nullable<string> {
  return createFibOverlay(chart, "fibonacciSegment", points)
}
export function createFibonacciSpiral(chart: Chart, points: Point[]): Nullable<string> {
  return createFibOverlay(chart, "fibonacciSpiral", points)
}
export function createFibonacciSpeedResistanceFan(chart: Chart, points: Point[]): Nullable<string> {
  return createFibOverlay(chart, "fibonacciSpeedResistanceFan", points)
}

// 3-point fibonacci (totalStep 4)
export function createFibonacciExtension(chart: Chart, points: Point[]): Nullable<string> {
  return createFibOverlay(chart, "fibonacciExtension", points)
}

export function removeFibonacci(chart: Chart, id: string): void {
  chart.removeOverlay({id})
}
