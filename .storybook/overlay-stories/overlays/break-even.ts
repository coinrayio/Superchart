import type {Chart} from "@superchart"
import {createPriceLine, type PriceLine} from "@superchart/index"

export function createBreakEven(chart: Chart, price: number, color = "#D05DDF"): PriceLine {
  return createPriceLine(chart, {price})
    .setLineColor(color)
    .setLineStyle("solid")
    .setLineWidth(1)
    .setLabelTextColor(color)
    .setLabelBackgroundColor("transparent")
    .setLabelBorderColor(color)
    .setYAxisLabelTextColor("#FFFFFF")
    .setYAxisLabelBackgroundColor(color)
    .setYAxisLabelBorderColor(color)
    .setLabelVisible(true)
    .setLabelAlign('center')
    // .setLabelOffsetPercentX(50)   // this overrides .setLabelAlign('')
    .setLabelPosition('center')
    .setEditable(true)
    .setText('Break Even')
}

export function updateBreakEven(line: PriceLine, price: number, color = "#D05DDF"): void {
  line
    .setPrice(price)
}

export function removeBreakEven(line: PriceLine): void {
  line.remove()
}
