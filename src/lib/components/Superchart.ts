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
  ReplayEngine,
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
import { createChartStore, type ChartStore } from '../store/chartStore'

// ---- Toolbar types ----

export interface ToolbarButtonOptions {
  /** Where to place the button. 'left' = after period selector; 'right' = before fullscreen. Default: 'right' */
  align?: 'left' | 'right'
  /** SVG markup or HTML string rendered as the button icon */
  icon?: string
  /** Text label shown next to the icon */
  text?: string
  /** Tooltip shown on hover */
  tooltip?: string
  /** Called when the button is clicked */
  onClick?: () => void
}

/** A regular clickable item in a toolbar dropdown */
export interface ToolbarDropdownActionItem {
  type?: 'item'
  /** Display label */
  text: string
  /** SVG markup or HTML string rendered before the label */
  icon?: string
  /** Called when the item is clicked */
  onClick: () => void
}

/** A visual separator line in a toolbar dropdown */
export interface ToolbarDropdownSeparator {
  type: 'separator'
}

export type ToolbarDropdownItem = ToolbarDropdownActionItem | ToolbarDropdownSeparator

export interface ToolbarDropdownOptions {
  /** Where to place the dropdown trigger. Default: 'right' */
  align?: 'left' | 'right'
  /** SVG markup or HTML string rendered as the trigger icon */
  icon?: string
  /** Text label shown on the trigger button */
  text?: string
  /** Tooltip shown on hover */
  tooltip?: string
  /** Items rendered inside the dropdown list */
  items: ToolbarDropdownItem[]
}

// ---- Event types ----

/** Visible time range as unix timestamps (seconds) */
export interface VisibleTimeRange {
  /** Unix timestamp (seconds) of the leftmost visible bar */
  from: number
  /** Unix timestamp (seconds) of the rightmost visible bar */
  to: number
}

/** Result from crosshair/click events — pixel coordinates + chart point */
export interface PriceTimeResult {
  /**
   * Pixel coordinate on the chart canvas plus page-relative coordinates.
   * `pageX`/`pageY` are only populated for click-family events (select /
   * rightSelect / doubleSelect). For `crosshairMoved` they are 0 because
   * the crosshair state has no native-event origin.
   */
  coordinate: { x: number; y: number; pageX: number; pageY: number }
  /** Chart data point: timestamp (unix seconds) and price */
  point: { time: number; price: number }
}

// ---- Main option types ----

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
  /**
   * Show the period bar (default: true). When false the bar is not rendered
   * and the chart canvas reclaims the space. Per-button hide / disable is
   * done by the consumer via CSS on `[data-button="<id>"]` — see the feature
   * doc for button ids and example rules.
   */
  periodBarVisible?: boolean

  // Optional - Available options
  /** Available period options */
  periods?: Period[]

  // Optional - Event callbacks
  /** Called when the symbol changes (from UI or API) */
  onSymbolChange?: (symbol: SymbolInfo) => void
  /** Called when the period/interval changes (from UI or API) */
  onPeriodChange?: (period: Period) => void
  /** Called when the visible range changes (scroll, zoom, data load) */
  onVisibleRangeChange?: (range: VisibleTimeRange) => void
  /** Called when the crosshair moves — provides current price + time under the cursor */
  onCrosshairMoved?: (result: PriceTimeResult) => void
  /** Called when the user clicks on the chart — provides the clicked price + time */
  onSelect?: (result: PriceTimeResult) => void

  /** Called when the user right-clicks on the chart — provides the clicked price + time */
  onRightSelect?: (result: PriceTimeResult) => void

  /** Called when the user double-clicks on the chart — provides the clicked price + time */
  onDoubleSelect?: (result: PriceTimeResult) => void

  /** Called when the chart is fully initialized and ready to draw. getChart() is guaranteed to return a Chart after this fires. */
  onReady?: () => void

  // Optional - Logging
  /** Enable debug logging (default: true). Set to false to silence non-essential logs. */
  debug?: boolean
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
  /**
   * Programmatically open the script editor panel.
   * Only functional when a scriptProvider was configured.
   * @param options.initialCode - Pre-fill the editor with this code
   * @param options.readOnly - Open in read-only view mode (for inspecting server preset code)
   */
  openScriptEditor: (options?: { initialCode?: string; readOnly?: boolean }) => void
  /** Programmatically close the script editor panel */
  closeScriptEditor: () => void
  /** Show or hide the entire period bar. */
  setPeriodBarVisible: (visible: boolean) => void
  /**
   * Add a custom button to the period bar toolbar.
   * Returns the created HTMLButtonElement — set innerHTML, add event listeners, or apply classes freely.
   */
  createButton: (options?: ToolbarButtonOptions) => HTMLElement
  /**
   * Add a custom dropdown to the period bar toolbar.
   * Returns the trigger HTMLElement. The dropdown list is managed internally (pure DOM, no React).
   */
  createDropdown: (options: ToolbarDropdownOptions) => HTMLElement
  /** Subscribe to symbol changes. Returns unsubscribe function. */
  onSymbolChange: (callback: (symbol: SymbolInfo) => void) => () => void
  /** Subscribe to period changes. Returns unsubscribe function. */
  onPeriodChange: (callback: (period: Period) => void) => () => void
  /** Subscribe to visible range changes. Returns unsubscribe function. */
  onVisibleRangeChange: (callback: (range: VisibleTimeRange) => void) => () => void
  /** Subscribe to crosshair movement. Returns unsubscribe function. */
  onCrosshairMoved: (callback: (result: PriceTimeResult) => void) => () => void
  /** Subscribe to chart click/select. Returns unsubscribe function. */
  onSelect: (callback: (result: PriceTimeResult) => void) => () => void
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
  private _store: ChartStore
  private _container: Nullable<HTMLElement> = null
  private _root: Nullable<Root> = null
  private _api: Nullable<SuperchartApi> = null
  private _options: SuperchartOptions
  /** Calls queued before React has finished mounting and the API is ready */
  private _pendingToolbarCalls: Array<() => void> = []
  /** Event listeners for symbol/period/visible-range changes */
  private _listeners = {
    symbolChange: new Set<(symbol: SymbolInfo) => void>(),
    periodChange: new Set<(period: Period) => void>(),
    visibleRangeChange: new Set<(range: VisibleTimeRange) => void>(),
    crosshairMoved: new Set<(result: PriceTimeResult) => void>(),
    select: new Set<(result: PriceTimeResult) => void>(),
    rightSelect: new Set<(result: PriceTimeResult) => void>(),
    doubleSelect: new Set<(result: PriceTimeResult) => void>(),
  }
  /** Whether the chart has completed initialization */
  private _isReady = false
  /** Callbacks waiting for the chart to become ready */
  private _readyCallbacks: Array<() => void> = []
  /** Whether the replay error sync handler has been registered on the engine */
  private _replayErrorSyncDone = false
  /** Cleanup functions for store/chart subscriptions */
  private _unsubscribers: Array<() => void> = []
  /** Set to true after constructor finishes store init, to avoid firing callbacks for initial values */
  private _initialized = false

  constructor(options: SuperchartOptions) {
    // Create an isolated store for this instance
    this._store = createChartStore()

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
    this._store.setSymbol(options.symbol)
    this._store.setPeriod(options.period)
    this._store.setTheme(options.theme ?? 'light')
    this._store.setLocale(options.locale ?? 'en-US')
    this._store.setTimezone(options.timezone ?? 'Etc/UTC')
    this._store.setMainIndicators(options.mainIndicators ?? [])
    this._store.setDrawingBarVisible(options.drawingBarVisible ?? false)
    this._store.setPeriodBarVisible(options.periodBarVisible ?? true)

    this._store.setDebug(options.debug ?? true)

    if (options.storageAdapter) {
      this._store.setStorageAdapter(options.storageAdapter)
    }
    this._store.setStorageKey(options.storageKey ?? options.symbol.ticker)

    if (options.indicatorProvider) {
      this._store.setIndicatorProvider(options.indicatorProvider)
    }

    if (options.scriptProvider) {
      this._store.setScriptProvider(options.scriptProvider)
    }

    if (options.subIndicators) {
      const subIndicatorsRecord: Record<string, string> = {}
      options.subIndicators.forEach((name) => {
        subIndicatorsRecord[name] = ''
      })
      this._store.setSubIndicators(subIndicatorsRecord)
    }

    // Root element ID for portals
    this._store.setRootElementId(this._container.id ?? '')

    // Render React component
    this._root = createRoot(this._container)
    this._root.render(
      createElement(SuperchartComponent, {
        store: this._store,
        onApiReady: (api: SuperchartApi) => {
          this._api = api
          // Replay any createButton / createDropdown calls made before React was ready
          for (const fn of this._pendingToolbarCalls) fn()
          this._pendingToolbarCalls = []

          // Clean up any previous chart subscriptions (React strict mode / HMR
          // can call onApiReady multiple times with the same chart instance)
          for (const unsub of this._unsubscribers) unsub()
          this._unsubscribers = []

          // Mark as ready and fire all waiting callbacks
          this._isReady = true
          for (const cb of this._readyCallbacks) cb()
          this._readyCallbacks = []

          // Subscribe to visible range changes from the underlying chart
          const chart = api.getChart()
          if (chart) {
            const handler = (): void => {
              if (this._listeners.visibleRangeChange.size === 0) return
              const ts = chart.getVisibleRangeTimestamps()
              if (ts === null) return
              const timeRange: VisibleTimeRange = {
                from: Math.floor(ts.from / 1000),
                to: Math.floor(ts.to / 1000),
              }
              this._listeners.visibleRangeChange.forEach(cb => cb(timeRange))
            }
            chart.subscribeAction('onVisibleRangeChange', handler)
            this._unsubscribers.push(() => chart.unsubscribeAction('onVisibleRangeChange', handler))

            // Crosshair moved — convert y to price via convertFromPixel
            const crosshairHandler = (data?: unknown): void => {
              if (this._listeners.crosshairMoved.size === 0) return
              const cr = data as { x?: number; y?: number; pageX?: number; pageY?: number; timestamp?: number }
              if (cr.x == null || cr.y == null) return
              const pts = chart.convertFromPixel(
                [{ x: cr.x, y: cr.y }],
                { paneId: 'candle_pane' }
              ) as Array<{ timestamp?: number; value?: number }>
              const pt = pts[0]
              const result: PriceTimeResult = {
                coordinate: { x: cr.x, y: cr.y, pageX: 0, pageY: 0 },
                point: {
                  time: Math.floor((cr.timestamp ?? pt.timestamp ?? 0) / 1000),
                  price: pt.value ?? 0,
                },
              }
              this._listeners.crosshairMoved.forEach(cb => cb(result))
            }
            chart.subscribeAction('onCrosshairChange', crosshairHandler)
            this._unsubscribers.push(() => chart.unsubscribeAction('onCrosshairChange', crosshairHandler))

            // Chart click/select — uses onChartClick action from klinecharts
            const clickHandler = (data?: unknown): void => {
              if (this._listeners.select.size === 0) return
              const cr = data as { x?: number; y?: number; pageX?: number; pageY?: number; timestamp?: number }
              if (cr.x == null || cr.y == null) return
              const pts = chart.convertFromPixel(
                [{ x: cr.x, y: cr.y }],
                { paneId: 'candle_pane' }
              ) as Array<{ timestamp?: number; value?: number }>
              const pt = pts[0]
              const result: PriceTimeResult = {
                coordinate: { x: cr.x, y: cr.y, pageX: cr.pageX ?? 0, pageY: cr.pageY ?? 0 },
                point: {
                  time: Math.floor((cr.timestamp ?? pt.timestamp ?? 0) / 1000),
                  price: pt.value ?? 0,
                },
              }
              this._listeners.select.forEach(cb => cb(result))
            }
            chart.subscribeAction('onChartClick', clickHandler)
            this._unsubscribers.push(() => chart.unsubscribeAction('onChartClick', clickHandler))

            // Chart right-click — uses onChartRightClick action from klinecharts
            const rightClickHandler = (data?: unknown): void => {
              if (this._listeners.rightSelect.size === 0) return
              const cr = data as { x?: number; y?: number; pageX?: number; pageY?: number; timestamp?: number }
              if (cr.x == null || cr.y == null) return
              const pts = chart.convertFromPixel(
                [{ x: cr.x, y: cr.y }],
                { paneId: 'candle_pane' }
              ) as Array<{ timestamp?: number; value?: number }>
              const pt = pts[0]
              const result: PriceTimeResult = {
                coordinate: { x: cr.x, y: cr.y, pageX: cr.pageX ?? 0, pageY: cr.pageY ?? 0 },
                point: {
                  time: Math.floor((cr.timestamp ?? pt.timestamp ?? 0) / 1000),
                  price: pt.value ?? 0,
                },
              }
              this._listeners.rightSelect.forEach(cb => cb(result))
            }
            chart.subscribeAction('onChartRightClick', rightClickHandler)
            this._unsubscribers.push(() => chart.unsubscribeAction('onChartRightClick', rightClickHandler))

            // Chart double-click — uses onChartDoubleClick action from klinecharts
            const doubleClickHandler = (data?: unknown): void => {
              if (this._listeners.doubleSelect.size === 0) return
              const cr = data as { x?: number; y?: number; pageX?: number; pageY?: number; timestamp?: number }
              if (cr.x == null || cr.y == null) return
              const pts = chart.convertFromPixel(
                [{ x: cr.x, y: cr.y }],
                { paneId: 'candle_pane' }
              ) as Array<{ timestamp?: number; value?: number }>
              const pt = pts[0]
              const result: PriceTimeResult = {
                coordinate: { x: cr.x, y: cr.y, pageX: cr.pageX ?? 0, pageY: cr.pageY ?? 0 },
                point: {
                  time: Math.floor((cr.timestamp ?? pt.timestamp ?? 0) / 1000),
                  price: pt.value ?? 0,
                },
              }
              this._listeners.doubleSelect.forEach(cb => cb(result))
            }
            chart.subscribeAction('onChartDoubleClick', doubleClickHandler)
            this._unsubscribers.push(() => chart.unsubscribeAction('onChartDoubleClick', doubleClickHandler))

            // Store subscriptions for chart → panel symbol/period sync.
            // Registered here (not in the constructor tail) so they're re-added
            // on every strict-mode/HMR re-invocation of onApiReady after the
            // _unsubscribers cleanup above.
            this._unsubscribers.push(this._store.subscribeSymbol((sym) => {
              if (!this._initialized || sym == null) return
              this._listeners.symbolChange.forEach(cb => cb(sym))
            }))

            this._unsubscribers.push(this._store.subscribePeriod((p) => {
              if (!this._initialized || p == null) return
              this._listeners.periodChange.forEach(cb => cb(p as Period))
            }))
          }
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

    // Register constructor-provided callbacks
    if (options.onSymbolChange) this._listeners.symbolChange.add(options.onSymbolChange)
    if (options.onPeriodChange) this._listeners.periodChange.add(options.onPeriodChange)
    if (options.onVisibleRangeChange) this._listeners.visibleRangeChange.add(options.onVisibleRangeChange)
    if (options.onCrosshairMoved) this._listeners.crosshairMoved.add(options.onCrosshairMoved)
    if (options.onSelect) this._listeners.select.add(options.onSelect)
    if (options.onRightSelect) this._listeners.rightSelect.add(options.onRightSelect)
    if (options.onDoubleSelect) this._listeners.doubleSelect.add(options.onDoubleSelect)
    if (options.onReady) this._readyCallbacks.push(options.onReady)

    // Set _initialized after store init so initial values don't fire callbacks.
    // The actual store.subscribeSymbol / subscribePeriod wiring lives in
    // onApiReady so it survives strict-mode/HMR re-invocations.
    this._initialized = true
  }

  // Proxy methods to internal API

  setTheme(theme: string): void {
    this._container?.setAttribute('data-theme', theme)
    this._api?.setTheme(theme)
  }

  getTheme(): string {
    return this._api?.getTheme() ?? this._store.theme()
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
    return this._api?.getLocale() ?? this._store.locale()
  }

  setTimezone(timezone: string): void {
    this._api?.setTimezone(timezone)
  }

  getTimezone(): string {
    return this._api?.getTimezone() ?? this._store.timezone()
  }

  setSymbol(symbol: SymbolInfo): void {
    this._api?.setSymbol(symbol)
  }

  getSymbol(): SymbolInfo {
    return this._api?.getSymbol() ?? this._store.symbol()!
  }

  setPeriod(period: Period): void {
    this._api?.setPeriod(period)
  }

  getPeriod(): Period {
    return this._api?.getPeriod() ?? this._store.period()!
  }

  getChart(): Nullable<Chart> {
    return this._api?.getChart() ?? this._store.instanceApi()
  }

  setVisibleRange(range: VisibleTimeRange): Promise<void> {
    const chart = this.getChart()
    if (!chart) return Promise.resolve()
    return chart.setVisibleRange({
      from: range.from * 1000,
      to: range.to * 1000,
    })
  }

  /**
   * Access the underlying ReplayEngine directly.
   * Returns null before the chart has finished mounting.
   * Also registers the period-sync error handler on first access.
   *
   * @example
   * ```ts
   * sc.replay?.setCurrentTime(Date.now() - 3600_000)
   * sc.replay?.onReplayStatusChange(status => console.log(status))
   * ```
   */
  get replay(): ReplayEngine | null {
    const chart = this.getChart()
    if (!chart) return null
    this._setupReplayErrorSync()
    return chart.getReplayEngine()
  }

  /**
   * Register a one-time handler on the engine that syncs the signal store's period
   * back when the engine reverts it (e.g. after a failed resolution change).
   * Must run after the chart is available. Safe to call multiple times — guarded by flag.
   */
  private _setupReplayErrorSync(): void {
    if (this._replayErrorSyncDone) return
    const chart = this.getChart()
    if (!chart) return
    this._replayErrorSyncDone = true

    const unsub = chart.getReplayEngine().onReplayError(() => {
      const ep = chart.getPeriod()
      const sp = this._store.period()
      if (ep !== null && sp !== null && (sp.type !== ep.type || sp.span !== ep.span)) {
        const textMap: Record<string, string> = { second: 's', minute: 'm', hour: 'H', day: 'D', week: 'W', month: 'M' }
        const text = `${ep.span}${textMap[ep.type] ?? ep.type}`
        this._store.setPeriod({ type: ep.type, span: ep.span, text } as Period)
      }
    })
    this._unsubscribers.push(unsub)
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

  openScriptEditor(options?: { initialCode?: string; readOnly?: boolean }): void {
    this._api?.openScriptEditor(options)
  }

  closeScriptEditor(): void {
    this._api?.closeScriptEditor()
  }

  setPeriodBarVisible(visible: boolean): void {
    this._api?.setPeriodBarVisible(visible)
  }

  createButton(options?: ToolbarButtonOptions): HTMLElement {
    if (this._api) return this._api.createButton(options)
    // API not ready yet (React still mounting) — queue the call
    this._pendingToolbarCalls.push(() => this._api?.createButton(options))
    return document.createElement('button')
  }

  createDropdown(options: ToolbarDropdownOptions): HTMLElement {
    if (this._api) return this._api.createDropdown(options)
    // API not ready yet (React still mounting) — queue the call
    this._pendingToolbarCalls.push(() => this._api?.createDropdown(options))
    return document.createElement('div')
  }

  onSymbolChange(callback: (symbol: SymbolInfo) => void): () => void {
    this._listeners.symbolChange.add(callback)
    return () => { this._listeners.symbolChange.delete(callback) }
  }

  onPeriodChange(callback: (period: Period) => void): () => void {
    this._listeners.periodChange.add(callback)
    return () => { this._listeners.periodChange.delete(callback) }
  }

  onVisibleRangeChange(callback: (range: VisibleTimeRange) => void): () => void {
    this._listeners.visibleRangeChange.add(callback)
    return () => { this._listeners.visibleRangeChange.delete(callback) }
  }

  onCrosshairMoved(callback: (result: PriceTimeResult) => void): () => void {
    this._listeners.crosshairMoved.add(callback)
    return () => { this._listeners.crosshairMoved.delete(callback) }
  }

  onSelect(callback: (result: PriceTimeResult) => void): () => void {
    this._listeners.select.add(callback)
    return () => { this._listeners.select.delete(callback) }
  }

  onRightSelect(callback: (result: PriceTimeResult) => void): () => void {
    this._listeners.rightSelect.add(callback)
    return () => { this._listeners.rightSelect.delete(callback) }
  }

  onDoubleSelect(callback: (result: PriceTimeResult) => void): () => void {
    this._listeners.doubleSelect.add(callback)
    return () => { this._listeners.doubleSelect.delete(callback) }
  }

  /**
   * Register a callback to be called when the chart is ready.
   * If the chart is already ready, the callback fires immediately.
   * Returns an unsubscribe function (no-op if already fired).
   */
  onReady(callback: () => void): () => void {
    if (this._isReady) {
      callback()
      return () => {}
    }
    this._readyCallbacks.push(callback)
    return () => {
      const idx = this._readyCallbacks.indexOf(callback)
      if (idx >= 0) this._readyCallbacks.splice(idx, 1)
    }
  }

  /**
   * Dispose the chart and cleanup resources
   */
  dispose(): void {
    // Clean up all event subscriptions
    for (const unsub of this._unsubscribers) unsub()
    this._unsubscribers = []
    this._listeners.symbolChange.clear()
    this._listeners.periodChange.clear()
    this._listeners.visibleRangeChange.clear()
    this._listeners.crosshairMoved.clear()
    this._listeners.select.clear()
    this._listeners.rightSelect.clear()
    this._listeners.doubleSelect.clear()
    this._initialized = false
    this._replayErrorSyncDone = false

    // Dispose providers before unmounting
    const provider = this._store.indicatorProvider()
    if (provider?.dispose) {
      provider.dispose()
    }

    const scriptProv = this._store.scriptProvider()
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

    // Reset store (only affects this instance's store)
    this._store.resetStore()

    this._api = null
    this._pendingToolbarCalls = []
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
