/**
 * Superchart - Framework-agnostic charting library
 *
 * This is the main entry point for the library. It provides a class-based API
 * that works with any framework (React, Vue, Angular, vanilla JS).
 *
 * Follows the pattern from coinray-chart-ui/src/KLineChartPro.tsx
 */

import { createRoot, type Root } from 'react-dom/client'
import { createElement } from 'react'
import type {
  Chart,
  DataLoader,
  DeepPartial,
  Nullable,
  Styles,
  OverlayCreate,
  OverlayMode,
} from 'klinecharts'
import { utils, dispose } from 'klinecharts'
import { SuperchartComponent } from './SuperchartComponent'
import type { Period, SymbolInfo } from '../types/chart'
import type { StorageAdapter } from '../types/storage'
import type { IndicatorProvider } from '../types/indicator'
import type { ScriptProvider } from '../types/script'
import type { OverlayProperties } from '../types/overlay'
import type { UseBackendIndicatorsReturn } from '../hooks/useBackendIndicators'
import type { PaneProperties } from '../store/chartStore'
import * as store from '../store/chartStore'

export interface SuperchartOptions {
  /** Container element or ID */
  container: string | HTMLElement
  /** Current symbol */
  symbol: SymbolInfo
  /** Current period/timeframe */
  period: Period
  /** Data loader for fetching OHLC data */
  dataLoader: DataLoader

  // Optional - Backend indicators
  /** Provider for backend-calculated indicators */
  indicatorProvider?: IndicatorProvider

  // Optional - Storage
  /** Storage adapter for persistence */
  storageAdapter?: StorageAdapter
  /** Storage key for this chart (default: symbol.ticker) */
  storageKey?: string

  // Optional - Initial state
  /** Initial main indicators (on candle pane) */
  mainIndicators?: string[]
  /** Initial sub indicators */
  subIndicators?: string[]

  // Optional - Customization
  /** Locale for i18n (default: 'en-US') */
  locale?: string
  /** Theme name (default: 'light') */
  theme?: 'light' | 'dark' | string
  /** IANA timezone (default: 'Etc/UTC') */
  timezone?: string
  /** Watermark text or element */
  watermark?: string | Node
  /** Style overrides */
  styleOverrides?: DeepPartial<Styles>

  // Optional - Script execution
  /** Provider for server-side script compilation and execution */
  scriptProvider?: ScriptProvider

  // Optional - UI toggles
  /** Show drawing toolbar (default: false) */
  drawingBarVisible?: boolean
  /** Show volume indicator (default: true) */
  showVolume?: boolean

  // Optional - Available options
  /** Available period options */
  periods?: Period[]
}

export interface SuperchartApi {
  /** Set the theme */
  setTheme: (theme: string) => void
  /** Get the current theme */
  getTheme: () => string
  /** Set custom styles */
  setStyles: (styles: DeepPartial<PaneProperties>) => void
  /** Get current styles */
  getStyles: () => DeepPartial<PaneProperties>
  /** Set locale */
  setLocale: (locale: string) => void
  /** Get locale */
  getLocale: () => string
  /** Set timezone */
  setTimezone: (timezone: string) => void
  /** Get timezone */
  getTimezone: () => string
  /** Set the symbol */
  setSymbol: (symbol: SymbolInfo) => void
  /** Get the current symbol */
  getSymbol: () => SymbolInfo
  /** Set the period */
  setPeriod: (period: Period) => void
  /** Get the current period */
  getPeriod: () => Period
  /** Get the underlying chart instance */
  getChart: () => Nullable<Chart>
  /** Resize the chart */
  resize: () => void
  /** Get screenshot URL */
  getScreenshotUrl: (type?: 'png' | 'jpeg', backgroundColor?: string) => string
  /** Create an overlay */
  createOverlay: (overlay: OverlayCreate & { properties?: DeepPartial<OverlayProperties> }, paneId?: string) => string | null
  /** Set overlay mode */
  setOverlayMode: (mode: OverlayMode) => void
  /** Get the backend indicators API (null if no IndicatorProvider configured) */
  getBackendIndicators: () => UseBackendIndicatorsReturn | null
  /** Dispose the chart */
  dispose: () => void
}

/**
 * Superchart - Main charting class
 *
 * @example
 * ```typescript
 * const chart = new Superchart({
 *   container: 'chart-container',
 *   symbol: { ticker: 'BTCUSDT', pricePrecision: 2, volumePrecision: 0 },
 *   period: { span: 1, type: 'hour', text: '1H' },
 *   dataLoader: myDataLoader,
 * })
 *
 * // Use the API
 * chart.setTheme('dark')
 * chart.setSymbol({ ticker: 'ETHUSDT', ... })
 *
 * // Cleanup
 * chart.dispose()
 * ```
 */
export default class Superchart implements SuperchartApi {
  private _container: Nullable<HTMLElement> = null
  private _root: Nullable<Root> = null
  private _api: Nullable<SuperchartApi> = null
  private _options: SuperchartOptions

  constructor(options: SuperchartOptions) {
    // Resolve container
    if (utils.isString(options.container)) {
      this._container = document.getElementById(options.container as string)
      if (!this._container) {
        throw new Error(`Container element with id "${options.container}" not found`)
      }
    } else {
      this._container = options.container as HTMLElement
    }

    this._options = options

    // Set up container
    this._container.classList.add('superchart')
    this._container.setAttribute('data-theme', options.theme ?? 'light')

    // Initialize store with options
    store.setSymbol(options.symbol)
    store.setPeriod(options.period)
    store.setTheme(options.theme ?? 'light')
    store.setLocale(options.locale ?? 'en-US')
    store.setTimezone(options.timezone ?? 'Etc/UTC')
    store.setMainIndicators(options.mainIndicators ?? [])
    store.setDrawingBarVisible(options.drawingBarVisible ?? false)

    if (options.storageAdapter) {
      store.setStorageAdapter(options.storageAdapter)
    }
    store.setStorageKey(options.storageKey ?? options.symbol.ticker)

    if (options.indicatorProvider) {
      store.setIndicatorProvider(options.indicatorProvider)
    }

    if (options.scriptProvider) {
      store.setScriptProvider(options.scriptProvider)
    }

    if (options.subIndicators) {
      const subIndicatorsRecord: Record<string, string> = {}
      options.subIndicators.forEach((name) => {
        subIndicatorsRecord[name] = ''
      })
      store.setSubIndicators(subIndicatorsRecord)
    }

    // Root element ID for portals
    store.setRootElementId(this._container.id ?? '')

    // Render React component
    this._root = createRoot(this._container)
    this._root.render(
      createElement(SuperchartComponent, {
        onApiReady: (api: SuperchartApi) => {
          this._api = api
        },
        dataLoader: options.dataLoader,
        watermark: options.watermark,
        styleOverrides: options.styleOverrides,
        showDrawingBar: options.drawingBarVisible ?? false,
        showVolume: options.showVolume ?? true,
        periods: options.periods,
        className: '',
      })
    )
  }

  // Proxy methods to internal API

  setTheme(theme: string): void {
    this._container?.setAttribute('data-theme', theme)
    this._api?.setTheme(theme)
  }

  getTheme(): string {
    return this._api?.getTheme() ?? store.theme()
  }

  setStyles(styles: DeepPartial<PaneProperties>): void {
    this._api?.setStyles(styles)
  }

  getStyles(): DeepPartial<PaneProperties> {
    return this._api?.getStyles() ?? {}
  }

  setLocale(locale: string): void {
    this._api?.setLocale(locale)
  }

  getLocale(): string {
    return this._api?.getLocale() ?? store.locale()
  }

  setTimezone(timezone: string): void {
    this._api?.setTimezone(timezone)
  }

  getTimezone(): string {
    return this._api?.getTimezone() ?? store.timezone()
  }

  setSymbol(symbol: SymbolInfo): void {
    this._api?.setSymbol(symbol)
  }

  getSymbol(): SymbolInfo {
    return this._api?.getSymbol() ?? store.symbol()!
  }

  setPeriod(period: Period): void {
    this._api?.setPeriod(period)
  }

  getPeriod(): Period {
    return this._api?.getPeriod() ?? store.period()!
  }

  getChart(): Nullable<Chart> {
    return this._api?.getChart() ?? store.instanceApi()
  }

  resize(): void {
    this._api?.resize()
  }

  getScreenshotUrl(type?: 'png' | 'jpeg', backgroundColor?: string): string {
    return this._api?.getScreenshotUrl(type, backgroundColor) ?? ''
  }

  createOverlay(
    overlay: OverlayCreate & { properties?: DeepPartial<OverlayProperties> },
    paneId?: string
  ): string | null {
    return this._api?.createOverlay(overlay, paneId) ?? null
  }

  setOverlayMode(mode: OverlayMode): void {
    this._api?.setOverlayMode(mode)
  }

  getBackendIndicators(): UseBackendIndicatorsReturn | null {
    return this._api?.getBackendIndicators() ?? null
  }

  /**
   * Dispose the chart and cleanup resources
   */
  dispose(): void {
    // Dispose providers before unmounting
    const provider = store.indicatorProvider()
    if (provider?.dispose) {
      provider.dispose()
    }

    const scriptProv = store.scriptProvider()
    if (scriptProv?.dispose) {
      scriptProv.dispose()
    }

    if (this._root) {
      this._root.unmount()
      this._root = null
    }

    if (this._container) {
      dispose(this._container)
      this._container.classList.remove('superchart')
      this._container.removeAttribute('data-theme')
      this._container = null
    }

    // Reset store
    store.resetStore()

    this._api = null
  }

  /**
   * Destroy alias for dispose (for compatibility)
   */
  destroy(): void {
    this.dispose()
  }

  /**
   * Get the original options used to create the chart
   */
  getOptions(): SuperchartOptions {
    return this._options
  }
}

// Named export for convenience
export { Superchart }
