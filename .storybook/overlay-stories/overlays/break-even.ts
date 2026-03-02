import type {Chart} from "klinecharts"

export function createBreakEven(chart: Chart, price: number, color = "#D05DDF"): string | null {
  return chart.createOverlay({
    name: "priceLine",
    points: [{value: price}],
    styles: {
      line: {color, size: 1, style: "dashed"},
      text: {color: "#FFFFFF", backgroundColor: color},
    },
    lock: true,
  })
}

export function updateBreakEven(chart: Chart, id: string, price: number, color = "#D05DDF"): void {
  chart.overrideOverlay({id, points: [{value: price}], styles: {
    line: {color, size: 1, style: "dashed"},
    text: {color: "#FFFFFF", backgroundColor: color},
  }})
}

export function removeBreakEven(chart: Chart, id: string): void {
  chart.removeOverlay({id})
}
