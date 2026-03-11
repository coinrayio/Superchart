import type {Chart} from "klinecharts"
import {createPriceLine, type PriceLine} from "@superchart/index"

export function createBreakEven(chart: Chart, price: number, color = "#D05DDF"): PriceLine {
  return createPriceLine(chart, {price})
    .setLineColor(color)
    .setLineStyle("dashed")
    .setLineWidth(1)
    .setLabelTextColor("#FFFFFF")
    .setLabelBackgroundColor(color)
    .setLabelBorderColor(color)
    .setYAxisLabelTextColor("#FFFFFF")
    .setYAxisLabelBackgroundColor(color)
    .setYAxisLabelBorderColor(color)
    .setLabelVisible(true)
    .setLabelAlign('center')
    .setLabelOffsetPercentX(50)
    .setLabelPosition('center')
    .setEditable(true)
    .setText('Break Even')
}

export function updateBreakEven(line: PriceLine, price: number, color = "#D05DDF"): void {
  line
    .setPrice(price)
    .setLineColor(color)
    .setLabelBackgroundColor(color)
    .setLabelBorderColor(color)
    .setYAxisLabelBackgroundColor(color)
    .setYAxisLabelBorderColor(color)
}

export function removeBreakEven(line: PriceLine): void {
  line.remove()
}
