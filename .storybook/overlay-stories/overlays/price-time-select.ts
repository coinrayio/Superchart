import type {Superchart} from "@superchart/index"

export interface PriceTimeResult {
  price: number
  time: number
}

export function startPriceTimeSelect(
  _superchart: Superchart,
  _callbacks: {
    onCrosshairMoved?: (result: PriceTimeResult) => void
    onSelect: (result: PriceTimeResult) => void
  },
): () => void {
  return () => {}
}
