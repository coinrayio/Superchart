import type { Superchart, PriceTimeResult } from "@superchart/index"

export type { PriceTimeResult }

/**
 * Start listening for crosshair movement and chart clicks.
 * Returns an unsubscribe function that cleans up both listeners.
 */
export function startPriceTimeSelect(
  superchart: Superchart,
  callbacks: {
    onCrosshairMoved?: (result: PriceTimeResult) => void
    onSelect?: (result: PriceTimeResult) => void
    onRightSelect?: (result: PriceTimeResult) => void
    onDoubleSelect?: (result: PriceTimeResult) => void
  },
): () => void {
  const unsubs: Array<() => void> = []

  if (callbacks.onCrosshairMoved) {
    unsubs.push(superchart.onCrosshairMoved(callbacks.onCrosshairMoved))
  }
  if (callbacks.onSelect) {
    unsubs.push(superchart.onSelect(callbacks.onSelect))
  }
  if (callbacks.onRightSelect) {
    unsubs.push(superchart.onRightSelect(callbacks.onRightSelect))
  }
  if (callbacks.onDoubleSelect) {
    unsubs.push(superchart.onDoubleSelect(callbacks.onDoubleSelect))
  }

  return () => { unsubs.forEach(fn => fn()) }
}
