/**
 * Debug logger — only prints when the debug flag is true.
 *
 * Pass the getter from the per-instance ChartStore:
 *   import { log } from '../utils/log'
 *   const store = useChartStore()
 *   log(store.debug, 'message', ...)
 *
 * The first argument is the debug getter (or a boolean), remaining args are
 * forwarded to console.log.
 */
export function log(debugGetter: (() => boolean) | boolean, ...args: unknown[]): void {
  const isDebug = typeof debugGetter === 'function' ? debugGetter() : debugGetter
  if (isDebug) console.log(...args)
}
