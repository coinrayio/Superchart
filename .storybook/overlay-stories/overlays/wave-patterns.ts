import type {Chart, Nullable} from "klinecharts"

type Point = {timestamp: number, value: number}

function createWaveOverlay(chart: Chart, name: string, points: Point[]): Nullable<string> {
  return chart.createOverlay({
    name,
    points,
    lock: true,
  })
}

// threeWaves: 4 points (totalStep 5)
export function createThreeWaves(chart: Chart, points: Point[]): Nullable<string> {
  return createWaveOverlay(chart, "threeWaves", points)
}

// fiveWaves: 6 points (totalStep 7)
export function createFiveWaves(chart: Chart, points: Point[]): Nullable<string> {
  return createWaveOverlay(chart, "fiveWaves", points)
}

// eightWaves: 9 points (totalStep 10)
export function createEightWaves(chart: Chart, points: Point[]): Nullable<string> {
  return createWaveOverlay(chart, "eightWaves", points)
}

// anyWaves: unlimited points
export function createAnyWaves(chart: Chart, points: Point[]): Nullable<string> {
  return createWaveOverlay(chart, "anyWaves", points)
}

export function removeWave(chart: Chart, id: string): void {
  chart.removeOverlay({id})
}
