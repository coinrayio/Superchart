/**
 * Default values for every `FeatureFlag`. Every flag declared in `types.ts`
 * MUST appear here — the type is enforced by the `Record<FeatureFlag, ...>`
 * shape, so adding a flag without a default is a compile error.
 */

import type { FeatureFlag } from './types'

export const FEATURE_DEFAULTS: Record<FeatureFlag, boolean> = {
  // ---- Toolbars / chrome ----
  // Drawing toolbar is *available* by default (the feature exists). Whether
  // it's currently *visible* is the orthogonal `drawingBarVisible` option,
  // which defaults to false — i.e. feature on, panel collapsed.
  drawing_bar: true,
  period_bar: true,
  screenshot_button: true,
  fullscreen_button: true,
  symbol_search: true,
  period_picker: true,
  indicator_picker: true,

  // ---- Interaction ----
  right_click_menu: true,
  longpress_menu: true,
  crosshair_magnet: false,

  // ---- Persistence ----
  // Auto-save is on by default. Pair with `SuperchartOptions.autoSaveDelay`
  // (number, ms; default 0) to debounce — see docs/features.md.
  auto_save_state: true,

  // ---- Templates / browser ----
  // These flags exist now so consumers can pre-disable, but the underlying
  // UIs land in later tickets. Defaults to ON so future UIs appear without
  // requiring opt-in.
  study_templates: true,
  drawing_templates: true,
  chart_templates: true,
  multi_chart_browser: true,

  // ---- Chart visuals ----
  volume_in_legend: true,
  last_close_price_line: true,
}

/**
 * Resolve the effective enabled-set from defaults + overrides.
 * `disabledFeatures` wins over `enabledFeatures` when a flag appears in both
 * (matches TradingView's behavior).
 */
export function resolveFeatures(
  enabled?: readonly FeatureFlag[],
  disabled?: readonly FeatureFlag[]
): Set<FeatureFlag> {
  const result = new Set<FeatureFlag>(
    (Object.entries(FEATURE_DEFAULTS) as Array<[FeatureFlag, boolean]>)
      .filter(([, on]) => on)
      .map(([k]) => k)
  )
  if (enabled) {
    for (const f of enabled) result.add(f)
  }
  if (disabled) {
    for (const f of disabled) result.delete(f)
  }
  return result
}
