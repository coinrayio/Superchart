/**
 * Overlay Setting Store — backward-compatibility shim
 *
 * All overlay-setting state (popup signals, settings-panel flags, and the
 * timeframe-visibility map) has been merged into ChartStore so that every
 * Superchart instance gets its own isolated copy.
 *
 * This file re-exports only the *types* that were previously defined here
 * so that existing imports of `OverlayType`, `ExitType`, and `OverlayContextInfo`
 * continue to resolve without changes.
 *
 * Runtime signal accessors (`showOverlayPopup`, `setPopupOverlay`, etc.) are now
 * obtained via `useChartStore()` — use `store.showOverlayPopup()` instead of the
 * old module-level getter, and `store.setPopupOverlay(...)` instead of the setter.
 */

// Re-export types that moved to chartStore
export type { OverlayType, ExitType, OverlayContextInfo } from './chartStore'
