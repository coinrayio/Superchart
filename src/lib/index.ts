/**
 * Superchart - Advanced Charting Library UI
 *
 * A TradingView-grade charting UI library built on klinecharts.
 */

import Superchart from './components/Superchart'
import { load } from './i18n'

import './index.less'

// Register Superchart-side overlay extensions (orderLine, etc.)
// Side-effect import — must come before any chart usage
import './extension'

// Main class export
export { Superchart }

// i18n
export { load as loadLocale }

// Order line fluent API (from Superchart extension, not klinecharts)
export { createOrderLine } from './extension'

// Fluent API factories (from coinray-chart)
export { createPriceLine, createTradeLine } from 'klinecharts'

// DataLoader bridge (TradingView-compatible)
export { createDataLoader } from './datafeed'
export type { SuperchartDataLoader } from './datafeed'

// Overlay/figure/indicator registration — allows consumers to define custom overlays
export { registerOverlay, registerFigure, registerIndicator, DEFAULT_OVERLAY_PROPERTIES } from 'klinecharts'

// Core klinecharts types — re-exported so consumers import from superchart, not klinecharts
export type {
  Chart,
  Nullable,
  DeepPartial,
  KLineData,
  Point,
  Styles,
  Overlay,
  OverlayCreate,
  OverlayEvent,
  OverlayTemplate,
  Indicator,
  IndicatorCreate,
  IndicatorTemplate,
  FigureTemplate,
  ReplayStatus,
} from 'klinecharts'

// ReplayEngine type — exported so consumers can type sc.replay
export type { ReplayEngine } from 'klinecharts'

// Superchart-specific types
export type {
  SuperchartOptions,
  SuperchartApi,
  VisibleTimeRange,
  PriceTimeResult,
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

// Order line types (from Superchart extension)
export type { OrderLine, OrderLineProperties, OrderLineStyle, OrderLineEventListener } from './extension'

// Price line types (from coinray-chart)
export type { PriceLine, PriceLineProperties, PriceLineEventListener } from 'klinecharts'

// Trade line types (from coinray-chart)
export type { TradeLine, TradeLineProperties } from 'klinecharts'

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
