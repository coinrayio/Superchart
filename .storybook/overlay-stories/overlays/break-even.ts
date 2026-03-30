import type {Chart, Nullable, Overlay} from "@superchart"

function applyProperties(chart: Chart, id: string, props: Record<string, unknown>): void {
  const overlay = chart.getOverlays({id})[0] as Overlay & {setProperties?: (p: Record<string, unknown>, id: string) => void}
  if (overlay?.setProperties) overlay.setProperties(props, id)
}

export interface BreakEvenHandle {
  id: string
  setPrice: (price: number) => void
  setColor: (color: string) => void
  setText: (text: string) => void
  remove: () => void
}

export function createBreakEven(chart: Chart, price: number, color = "#D05DDF", text = "Break Even"): BreakEvenHandle | null {
  const id = chart.createOverlay({
    name: "priceLevelLine",
    points: [{value: price}],
    lock: false,
    visible: true,
    extendData: {
      text,
      textAlign: "right",
      textColor: color,
      lineColor: color,
      lineStyle: "solid",
      lineWidth: 1,
    },
    paneId: "candle_pane",
  }) as Nullable<string>

  if (!id) return null

  return {
    id,
    setPrice(price: number) {
      chart.overrideOverlay({id, points: [{value: price}]})
    },
    setColor(color: string) {
      applyProperties(chart, id, {lineColor: color, textColor: color})
    },
    setText(text: string) {
      applyProperties(chart, id, {text})
    },
    remove() {
      chart.removeOverlay({id})
    }
  }
}

export function removeBreakEven(handle: BreakEvenHandle): void {
  handle.remove()
}
