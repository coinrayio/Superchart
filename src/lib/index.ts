/**
 * Superchart - Advanced Charting Library UI
 *
 * A TradingView-grade charting UI library built on klinecharts.
 */

import { registerOverlay } from 'klinecharts'

import overlays from './extension'
import Superchart from './components/Superchart'
import { load } from './i18n'

import './index.less'

// Register all custom overlays
overlays.forEach(o => { registerOverlay(o) })

// Main class export
export { Superchart }

// i18n
export { load as loadLocale }

// Types - only export what consumers need
export type { SuperchartOptions, SuperchartApi } from './components/Superchart'
export type { Period, SymbolInfo, ProChart } from './types/chart'
export type { StorageAdapter, ChartState } from './types/storage'
export type { IndicatorProvider, IndicatorDefinition } from './types/indicator'
export type { OverlayProperties, ProOverlay, ProOverlayCreate } from './types/overlay'
export type { PaneProperties } from './store/chartStore'
