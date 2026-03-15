import { debug } from '../store/chartStore'

/** Debug log — only prints when `debug: true` is set in SuperchartOptions */
export function log(...args: unknown[]): void {
  if (debug()) console.log(...args)
}
