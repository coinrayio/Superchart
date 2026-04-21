/**
 * Chart State Store - re-export shim
 *
 * The authoritative implementation lives in `hooks/useChartState.ts`.
 * This file exists only for backward-compatible import paths used by
 * `component/popup/overlay/index.tsx` and any other legacy consumers.
 */

export { useChartState } from '../hooks/useChartState'
export type { UseChartStateOptions } from '../hooks/useChartState'
