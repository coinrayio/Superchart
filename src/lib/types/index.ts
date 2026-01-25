/**
 * Superchart Type Exports
 *
 * Re-exports base types from klinecharts and adds superchart-specific types.
 */

// =============================================================================
// Re-export core klinecharts types for convenience
// =============================================================================

export type {
  // Core data types
  KLineData,
  Nullable,
  DeepPartial,
  Coordinate,
  Point,
  BarSpace,
  Bounding,
  VisibleRange,

  // Symbol & Period (base types)
  SymbolInfo as BaseSymbolInfo,
  Period as BasePeriod,

  // Chart
  Chart,
  Options,
  Styles,
  PaneOptions,

  // Data loading
  DataLoader,

  // Actions
  ActionType,
  ActionCallback,

  // Indicators (klinecharts built-in)
  Indicator,
  IndicatorCreate,
  IndicatorTemplate,
  IndicatorFilter,
  IndicatorFigure,

  // Overlays (klinecharts built-in)
  Overlay,
  OverlayCreate,
  OverlayTemplate,
  OverlayMode,
  OverlayFigure,
  OverlayEvent,
  OverlayFilter,
  OverlayStyle,
} from 'klinecharts'

export {
  init,
  dispose,
  registerIndicator,
  registerOverlay,
  registerFigure,
  getSupportedIndicators,
  getSupportedOverlays,
  utils,
} from 'klinecharts'

// =============================================================================
// Chart types (extended from klinecharts)
// =============================================================================

export type {
  Period,
  SymbolInfo,
  ProChart,
  CrosshairInfo,
  PaneLayout,
} from './chart'

export { PERIODS, formatPeriod } from './chart'

// =============================================================================
// Storage types (NEW - for chart state persistence)
// =============================================================================

export type {
  StorageAdapter,
  ChartState,
  SavedIndicator,
  SettingValue,
  ChartPreferences,
} from './storage'

export {
  CHART_STATE_VERSION,
  createEmptyChartState,
  migrateChartState,
} from './storage'

// =============================================================================
// Overlay types (extended from klinecharts)
// =============================================================================

export type {
  OverlayProperties,
  ProOverlay,
  ProOverlayCreate,
  ProOverlayTemplate,
  OverlayEventListenerParams,
  SavedOverlayPoint,
  SavedOverlay,
  OverlayCategory,
} from './overlay'

export {
  BUILT_IN_OVERLAYS,
  OVERLAY_CATEGORIES,
  overlayPointsToSaved,
} from './overlay'

// =============================================================================
// Backend Indicator types (NEW - for server-calculated indicators)
// =============================================================================

export type {
  // Provider interface
  IndicatorProvider,
  IndicatorDefinition,
  IndicatorCategory,
  IndicatorSubscribeParams,
  IndicatorSubscription,
  IndicatorDataHandler,
  IndicatorTickHandler,

  // Metadata & plotting
  IndicatorMetadata,
  IndicatorPlot,
  PlotLine,
  PlotLineStyle,
  PlotHistogram,
  PlotHLine,
  PlotShape,
  PlotShapeStyle,
  PlotShapeLocation,
  PlotShapeSize,
  PlotChar,
  PlotFill,
  PlotBgColor,
  PlotCandle,
  PlotArrow,

  // Data
  IndicatorDataPoint,
  IndicatorSettingDef,
  IndicatorSettingType,
  SettingOption,
  ActiveIndicator,
} from './indicator'
