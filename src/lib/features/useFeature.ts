/**
 * `useFeature(flag)` — React hook returning the current enabled state of a
 * feature flag for the surrounding Superchart instance. Re-renders when the
 * flag is toggled at runtime via `superchart.setFeatureEnabled(...)` or
 * `store.setFeatureEnabled(...)`.
 *
 * @example
 *   const drawingBarEnabled = useFeature('drawing_bar')
 *   if (!drawingBarEnabled) return null
 */

import { useSyncExternalStore } from 'react'
import { useChartStore } from '../store/chartStoreContext'
import type { FeatureFlag } from './types'

export function useFeature(flag: FeatureFlag): boolean {
  const store = useChartStore()
  return useSyncExternalStore(
    // subscribe — fires the listener on any flag change; React's bail-out by
    // value reference handles "did this specific flag change" automatically.
    (notify) => store.subscribeFeatures(() => notify()),
    () => store.isFeatureEnabled(flag),
    () => store.isFeatureEnabled(flag)
  )
}
