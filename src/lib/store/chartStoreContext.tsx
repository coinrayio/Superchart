/**
 * ChartStoreContext - Per-instance React context for the chart store
 *
 * Each Superchart instance creates its own ChartStore and provides it
 * to its React tree via this context. React consumers call useChartStore()
 * to access the store without importing module-level globals.
 */

import { createContext, useContext } from 'react'
import type { ChartStore } from './chartStore'

export const ChartStoreContext = createContext<ChartStore | null>(null)

/**
 * Hook to access the per-instance ChartStore from any React component
 * inside a SuperchartComponent tree.
 */
export function useChartStore(): ChartStore {
  const store = useContext(ChartStoreContext)
  if (!store) {
    throw new Error('useChartStore must be called inside a SuperchartComponent tree')
  }
  return store
}
