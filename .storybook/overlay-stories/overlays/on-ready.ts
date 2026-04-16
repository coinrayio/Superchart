import type {Superchart} from "@superchart/index"

export function waitForReady(superchart: Superchart, onReady: () => void): () => void {
  return superchart.onReady(onReady)
}
