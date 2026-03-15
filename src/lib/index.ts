/**
 * Superchart - Advanced Charting Library UI
 *
 * A TradingView-grade charting UI library built on klinecharts.
 */

import Superchart from './components/Superchart'
import { load } from './i18n'

import './index.less'

// Main class export
export { Superchart }

// i18n
export { load as loadLocale }

// Order line & Price line (from coinray-chart)
export { createOrderLine, createPriceLine } from 'klinecharts'

// DataLoader bridge (TradingView-compatible)
export { createDataLoader } from './datafeed'
export type { SuperchartDataLoader } from './datafeed'

// Order line default styles (from coinray-chart)
export { DEFAULT_OVERLAY_PROPERTIES } from 'klinecharts'

// Types - only export what consumers need
export type {
  SuperchartOptions,
  SuperchartApi,
  VisibleTimeRange,
  ToolbarButtonOptions,
  ToolbarDropdownOptions,
  ToolbarDropdownItem,
  ToolbarDropdownActionItem,
  ToolbarDropdownSeparator,
} from './components/Superchart'
export type { Period, SymbolInfo, ProChart } from './types/chart'
export type { StorageAdapter, ChartState } from './types/storage'
export type { IndicatorProvider, IndicatorDefinition } from './types/indicator'
export type { UseBackendIndicatorsReturn } from './hooks/useBackendIndicators'
export type { OverlayProperties, ProOverlay, ProOverlayCreate, ProOverlayTemplate } from './types/overlay'
export type { PaneProperties } from './store/chartStore'

// Order line types (from coinray-chart via overlay.ts re-exports)
export type { OrderLine, OrderLineProperties, OrderLineStyle, OrderLineEventListener } from './types/overlay'

// Price line types (from coinray-chart)
export type { PriceLine, PriceLineProperties, PriceLineEventListener } from 'klinecharts'

// Datafeed types
export type {
  Datafeed,
  DatafeedConfiguration,
  LibrarySymbolInfo,
  Bar,
  PeriodParams,
  HistoryMetadata,
  SearchSymbolResult,
} from './types/datafeed'

// Script types
export type {
  ScriptProvider,
  ScriptLanguageDefinition,
  ScriptBuiltinFunction,
  ScriptBuiltinVariable,
  ScriptCompileResult,
  ScriptDiagnostic,
  ScriptExecuteParams,
  BotSubscription,
  BotSignal,
  ScriptInfo,
  ScriptSaveParams,
} from './types/script'

