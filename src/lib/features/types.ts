/**
 * Feature-flag system — TradingView-style `enabledFeatures` /
 * `disabledFeatures` so consumers opt UI features and behaviors in or out
 * without code changes.
 *
 * See `docs/features.md` for the full table of flags, defaults, and the
 * companion numeric options (e.g. `autoSaveDelay`).
 * See `PERSISTENCE_ROADMAP.md` Ticket 3 for the design rationale.
 *
 * Adding a new flag:
 * 1. Add it to the `FeatureFlag` union below.
 * 2. Set its default in `defaults.ts`.
 * 3. Wire the consumer (widget / hook / etc.) to read it via
 *    `useFeature(flag)` or `store.isFeatureEnabled(flag)`.
 * 4. Document it in `docs/features.md`.
 *
 * Numeric/non-boolean options that pair with a flag (e.g. `auto_save_state`
 * + `autoSaveDelay`) live on `SuperchartOptions` directly — the flag
 * union is strictly boolean.
 */

export type FeatureFlag =
  // ---- Toolbars / chrome ----
  | 'drawing_bar'
  | 'period_bar'
  | 'screenshot_button'
  | 'fullscreen_button'
  | 'settings_button'
  | 'timezone_button'
  | 'symbol_search'
  | 'period_picker'
  | 'indicator_picker'

  // ---- Interaction ----
  | 'right_click_menu'
  | 'longpress_menu'
  | 'crosshair_magnet'

  // ---- Persistence ----
  // Auto-save toggle. Companion option `SuperchartOptions.autoSaveDelay`
  // (number, ms) controls debounce — 0 = save on every mutation (default),
  // >0 = collapse mutations within the window into one save.
  | 'auto_save_state'

  // ---- Templates / browser (future tickets — flags reserved now so consumers
  //      can pre-disable to opt out before the UI lands) ----
  | 'study_templates'
  | 'drawing_templates'
  | 'chart_templates'
  | 'multi_chart_browser'

  // ---- Chart visuals ----
  | 'volume_in_legend'
  | 'last_close_price_line'
