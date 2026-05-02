/**
 * Chart Store - Per-instance state management for Superchart
 *
 * Converted from a module-level singleton into a factory (`createChartStore()`)
 * so each Superchart instance gets its own isolated state.
 *
 * The signal triple pattern (getter / setter / subscribe) is preserved.
 *
 * Overlay-setting state (popup position/visibility, settings panel flags, and the
 * timeframe-visibility map) is merged here rather than kept in a parallel factory.
 * Reason: all overlay-setting consumers are already inside the React tree that
 * receives ChartStore via context, so merging avoids a second context/provider while
 * keeping all per-instance state in one place.
 */

import type { Chart, DeepPartial, Nullable, Styles, Overlay } from 'klinecharts'
import type { Period, SymbolInfo } from '../types/chart'
import type { StorageAdapter } from '../types/storage'
import type { IndicatorProvider } from '../types/indicator'
import type { FeatureFlag } from '../features/types'
import { FEATURE_DEFAULTS } from '../features/defaults'
import type { ScriptProvider } from '../types/script'
import type { TimeframeVisibility } from '../types/overlay'
import { getScreenSize } from '../helpers'

// Simple observable store implementation
type Listener<T> = (value: T) => void

/**
 * Caveat: `set()` interprets any function argument as an updater
 * `(prev) => next`. If you need to store a callback whose type is itself a
 * function (e.g. an event handler), wrap it in an object holder before
 * passing in — see `setOnStorageError` below for the pattern. Otherwise the
 * setter will invoke your callback at registration time with the previous
 * value as its argument.
 */
function createSignal<T>(initialValue: T): [() => T, (value: T | ((prev: T) => T)) => void, (listener: Listener<T>) => () => void] {
  let value = initialValue
  const listeners = new Set<Listener<T>>()

  const get = () => value

  const set = (newValue: T | ((prev: T) => T)) => {
    const nextValue = typeof newValue === 'function' ? (newValue as (prev: T) => T)(value) : newValue
    if (nextValue !== value) {
      value = nextValue
      listeners.forEach(listener => listener(value))
    }
  }

  const subscribe = (listener: Listener<T>) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  return [get, set, subscribe]
}

// Pane properties extending styles
export interface PaneProperties extends Styles {
  backgroundType: 'solid' | 'gradient'
  background: string
  backgroundGradientStartColor: string
  backgroundGradientEndColor: string
}

// ── Overlay-setting types (kept here so consumers import from one place) ──

export type OverlayType =
  | 'point'
  | 'line'
  | 'rect'
  | 'polygon'
  | 'circle'
  | 'arc'
  | 'text'
  | 'horizontalStraightLine'
  | 'horizontalRayLine'
  | 'horizontalSegment'
  | 'verticalStraightLine'
  | 'verticalRayLine'
  | 'verticalSegment'
  | 'straightLine'
  | 'rayLine'
  | 'segment'
  | 'arrow'
  | 'priceLine'

export type ExitType = 'tp' | 'sl' | 'position' | 'sell'

export interface OverlayContextInfo {
  exitType?: ExitType
  overlayType?: OverlayType
}

/**
 * Per-instance chart store — created by createChartStore() inside the Superchart constructor.
 * All signals are scoped to the instance; two Superchart instances never share state.
 */
export interface ChartStore {
  // Chart instance
  instanceApi: () => Nullable<Chart>
  setInstanceApi: (value: Nullable<Chart>) => void
  subscribeInstanceApi: (listener: Listener<Nullable<Chart>>) => () => void

  // Symbol and period
  symbol: () => Nullable<SymbolInfo>
  setSymbol: (value: Nullable<SymbolInfo>) => void
  subscribeSymbol: (listener: Listener<Nullable<SymbolInfo>>) => () => void

  period: () => Nullable<Period>
  setPeriod: (value: Nullable<Period> | ((prev: Nullable<Period>) => Nullable<Period>)) => void
  subscribePeriod: (listener: Listener<Nullable<Period>>) => () => void

  // Theme and styles
  theme: () => string
  setTheme: (value: string) => void
  subscribeTheme: (listener: Listener<string>) => () => void

  styles: () => Nullable<DeepPartial<PaneProperties>>
  setStyles: (value: Nullable<DeepPartial<PaneProperties>>) => void
  subscribeStyles: (listener: Listener<Nullable<DeepPartial<PaneProperties>>>) => () => void

  // UI state
  loadingVisible: () => boolean
  setLoadingVisible: (value: boolean) => void
  subscribeLoadingVisible: (listener: Listener<boolean>) => () => void

  drawingBarVisible: () => boolean
  setDrawingBarVisible: (value: boolean) => void
  subscribeDrawingBarVisible: (listener: Listener<boolean>) => () => void

  fullScreen: () => boolean
  setFullScreen: (value: boolean) => void
  subscribeFullScreen: (listener: Listener<boolean>) => () => void

  // Period-bar visibility
  periodBarVisible: () => boolean
  setPeriodBarVisible: (value: boolean) => void
  subscribePeriodBarVisible: (listener: Listener<boolean>) => () => void

  // Indicators
  mainIndicators: () => string[]
  setMainIndicators: (value: string[]) => void
  subscribeMainIndicators: (listener: Listener<string[]>) => () => void

  subIndicators: () => Record<string, string>
  setSubIndicators: (value: Record<string, string>) => void
  subscribeSubIndicators: (listener: Listener<Record<string, string>>) => () => void

  // Overlays
  selectedOverlay: () => Nullable<Overlay>
  setSelectedOverlay: (value: Nullable<Overlay>) => void
  subscribeSelectedOverlay: (listener: Listener<Nullable<Overlay>>) => () => void

  selectedOverlayPosition: () => { x: number; y: number }
  setSelectedOverlayPosition: (value: { x: number; y: number }) => void
  subscribeSelectedOverlayPosition: (listener: Listener<{ x: number; y: number }>) => () => void

  // Storage
  storageAdapter: () => Nullable<StorageAdapter>
  setStorageAdapter: (value: Nullable<StorageAdapter>) => void
  subscribeStorageAdapter: (listener: Listener<Nullable<StorageAdapter>>) => () => void

  storageKey: () => string
  setStorageKey: (value: string) => void
  subscribeStorageKey: (listener: Listener<string>) => () => void

  /** Optional consumer-supplied error handler for storage failures (e.g. retry exhaustion). */
  onStorageError: () => Nullable<(err: Error) => void>
  setOnStorageError: (value: Nullable<(err: Error) => void>) => void

  /** Auto-save debounce in ms. 0 = save on every mutation (default); >0 = collapse mutations within the window into one save. */
  autoSaveDelay: () => number
  setAutoSaveDelay: (value: number) => void

  // Feature flags (Ticket 3) — see src/lib/features/types.ts for the catalog.
  /** True if the named feature is currently enabled for this instance. */
  isFeatureEnabled: (flag: FeatureFlag) => boolean
  /** Toggle a feature at runtime. Triggers re-render in components that subscribe via useFeature(). */
  setFeatureEnabled: (flag: FeatureFlag, enabled: boolean) => void
  /** Subscribe to feature-set changes. Listener fires after every setFeatureEnabled call (with the full flag→bool map). */
  subscribeFeatures: (listener: Listener<Record<FeatureFlag, boolean>>) => () => void

  // Backend indicator provider
  indicatorProvider: () => Nullable<IndicatorProvider>
  setIndicatorProvider: (value: Nullable<IndicatorProvider>) => void
  subscribeIndicatorProvider: (listener: Listener<Nullable<IndicatorProvider>>) => () => void

  // Script provider
  scriptProvider: () => Nullable<ScriptProvider>
  setScriptProvider: (value: Nullable<ScriptProvider>) => void
  subscribeScriptProvider: (listener: Listener<Nullable<ScriptProvider>>) => () => void

  // Chart state modification tracking
  chartModified: () => boolean
  setChartModified: (value: boolean) => void
  subscribeChartModified: (listener: Listener<boolean>) => () => void

  // Root element ID for portal mounting
  rootElementId: () => string
  setRootElementId: (value: string) => void
  subscribeRootElementId: (listener: Listener<string>) => () => void

  // Locale and timezone
  locale: () => string
  setLocale: (value: string) => void
  subscribeLocale: (listener: Listener<string>) => () => void

  timezone: () => string
  setTimezone: (value: string) => void
  subscribeTimezone: (listener: Listener<string>) => () => void

  // Screenshot URL for modal
  screenshotUrl: () => string
  setScreenshotUrl: (value: string) => void
  subscribeScreenshotUrl: (listener: Listener<string>) => () => void

  // Debug logging
  debug: () => boolean
  setDebug: (value: boolean) => void
  subscribeDebug: (listener: Listener<boolean>) => () => void

  // ── Overlay popup (right-click context menu) ──
  showOverlayPopup: () => boolean
  setShowOverlayPopup: (value: boolean) => void
  subscribeShowOverlayPopup: (listener: Listener<boolean>) => () => void

  popupTop: () => number
  setPopupTop: (value: number) => void
  subscribePopupTop: (listener: Listener<number>) => () => void

  popupLeft: () => number
  setPopupLeft: (value: number) => void
  subscribePopupLeft: (listener: Listener<number>) => () => void

  popupOverlay: () => Overlay | undefined
  setPopupOverlay: (value: Overlay | undefined) => void
  subscribePopupOverlay: (listener: Listener<Overlay | undefined>) => () => void

  popupOtherInfo: () => OverlayContextInfo | undefined
  setPopupOtherInfo: (value: OverlayContextInfo | undefined) => void
  subscribePopupOtherInfo: (listener: Listener<OverlayContextInfo | undefined>) => () => void

  // ── Settings panel visibility ──
  showPositionSetting: () => boolean
  setShowPositionSetting: (value: boolean) => void
  subscribeShowPositionSetting: (listener: Listener<boolean>) => () => void

  showOverlaySetting: () => boolean
  setShowOverlaySetting: (value: boolean) => void
  subscribeShowOverlaySetting: (listener: Listener<boolean>) => () => void

  showSellSetting: () => boolean
  setShowSellSetting: (value: boolean) => void
  subscribeShowSellSetting: (listener: Listener<boolean>) => () => void

  showTpSetting: () => boolean
  setShowTpSetting: (value: boolean) => void
  subscribeShowTpSetting: (listener: Listener<boolean>) => () => void

  showSlSetting: () => boolean
  setShowSlSetting: (value: boolean) => void
  subscribeShowSlSetting: (listener: Listener<boolean>) => () => void

  // ── Overlay timeframe-visibility map (per-chart, keyed by overlay id) ──
  getOverlayTimeframeVisibility: (id: string) => TimeframeVisibility | undefined
  setOverlayTimeframeVisibility: (id: string, visibility: TimeframeVisibility) => void
  deleteOverlayTimeframeVisibility: (id: string) => void
  getAllOverlayTimeframeVisibility: () => Map<string, TimeframeVisibility>

  // ── Derived helpers ──
  /** Returns the name of the current popup overlay, or 'Object' */
  getOverlayType: () => string
  /** Open the overlay context-menu popup at a screen coordinate */
  openOverlayPopup: (pageX: number, pageY: number, overlay: Overlay, others?: OverlayContextInfo) => void
  /** Close the overlay context-menu popup */
  closeOverlayPopup: () => void
  /** Close all setting panels (popup + every settings flag) */
  closeAllSettingPanels: () => void

  /** Reset all signals to their initial values */
  resetStore: () => void
}

/**
 * Create an isolated chart store for a single Superchart instance.
 */
export function createChartStore(): ChartStore {
  const [instanceApi, setInstanceApi, subscribeInstanceApi] = createSignal<Nullable<Chart>>(null)
  const [symbol, setSymbol, subscribeSymbol] = createSignal<Nullable<SymbolInfo>>(null)
  const [period, setPeriod, subscribePeriod] = createSignal<Nullable<Period>>(null)
  const [theme, setTheme, subscribeTheme] = createSignal<string>('light')
  const [styles, setStyles, subscribeStyles] = createSignal<Nullable<DeepPartial<PaneProperties>>>(null)
  const [loadingVisible, setLoadingVisible, subscribeLoadingVisible] = createSignal<boolean>(false)
  const [drawingBarVisible, setDrawingBarVisible, subscribeDrawingBarVisible] = createSignal<boolean>(false)
  const [fullScreen, setFullScreen, subscribeFullScreen] = createSignal<boolean>(false)
  const [periodBarVisible, setPeriodBarVisible, subscribePeriodBarVisible] = createSignal<boolean>(true)
  const [mainIndicators, setMainIndicators, subscribeMainIndicators] = createSignal<string[]>([])
  const [subIndicators, setSubIndicators, subscribeSubIndicators] = createSignal<Record<string, string>>({})
  const [selectedOverlay, setSelectedOverlay, subscribeSelectedOverlay] = createSignal<Nullable<Overlay>>(null)
  const [selectedOverlayPosition, setSelectedOverlayPosition, subscribeSelectedOverlayPosition] = createSignal<{ x: number; y: number }>({ x: 0, y: 0 })
  const [storageAdapter, setStorageAdapter, subscribeStorageAdapter] = createSignal<Nullable<StorageAdapter>>(null)
  const [storageKey, setStorageKey, subscribeStorageKey] = createSignal<string>('')
  // Wrap the callback in a holder object: createSignal's setter treats raw
  // function values as state-updaters and invokes them with the previous value,
  // which would call the consumer's error handler with `null` at registration
  // time. The wrapper keeps the function opaque to the signal machinery.
  const [onStorageErrorHolder, setOnStorageErrorHolder] = createSignal<{ fn: Nullable<(err: Error) => void> }>({ fn: null })
  const onStorageError = () => onStorageErrorHolder().fn
  const setOnStorageError = (value: Nullable<(err: Error) => void>) => {
    setOnStorageErrorHolder({ fn: value })
  }
  const [autoSaveDelay, setAutoSaveDelay] = createSignal<number>(0)

  // Feature flags — kept as a Map so we can fire one subscriber call after
  // any per-flag toggle and let consumers re-derive their booleans. The
  // initial value is a copy of FEATURE_DEFAULTS; constructor-time
  // overrides (`enabledFeatures` / `disabledFeatures`) are applied by
  // Superchart.ts via setFeatureEnabled().
  const featureMap = new Map<FeatureFlag, boolean>(
    Object.entries(FEATURE_DEFAULTS) as Array<[FeatureFlag, boolean]>
  )
  const featureListeners = new Set<Listener<Record<FeatureFlag, boolean>>>()
  const isFeatureEnabled = (flag: FeatureFlag): boolean => featureMap.get(flag) ?? false
  const featureSnapshot = (): Record<FeatureFlag, boolean> => {
    const obj = {} as Record<FeatureFlag, boolean>
    featureMap.forEach((v, k) => { obj[k] = v })
    return obj
  }
  const setFeatureEnabled = (flag: FeatureFlag, enabled: boolean): void => {
    const prev = featureMap.get(flag) ?? false
    if (prev === enabled) return
    featureMap.set(flag, enabled)
    const snap = featureSnapshot()
    featureListeners.forEach(l => l(snap))
  }
  const subscribeFeatures = (listener: Listener<Record<FeatureFlag, boolean>>): (() => void) => {
    featureListeners.add(listener)
    return () => featureListeners.delete(listener)
  }

  const [indicatorProvider, setIndicatorProvider, subscribeIndicatorProvider] = createSignal<Nullable<IndicatorProvider>>(null)
  const [scriptProvider, setScriptProvider, subscribeScriptProvider] = createSignal<Nullable<ScriptProvider>>(null)
  const [chartModified, setChartModified, subscribeChartModified] = createSignal<boolean>(false)
  const [rootElementId, setRootElementId, subscribeRootElementId] = createSignal<string>('')
  const [locale, setLocale, subscribeLocale] = createSignal<string>('en-US')
  const [timezone, setTimezone, subscribeTimezone] = createSignal<string>('Etc/UTC')
  const [screenshotUrl, setScreenshotUrl, subscribeScreenshotUrl] = createSignal<string>('')
  const [debug, setDebug, subscribeDebug] = createSignal<boolean>(true)

  // ── Overlay popup signals ──
  const [showOverlayPopup, setShowOverlayPopup, subscribeShowOverlayPopup] = createSignal<boolean>(false)
  const [popupTop, setPopupTop, subscribePopupTop] = createSignal<number>(0)
  const [popupLeft, setPopupLeft, subscribePopupLeft] = createSignal<number>(0)
  const [popupOverlay, setPopupOverlay, subscribePopupOverlay] = createSignal<Overlay | undefined>(undefined)
  const [popupOtherInfo, setPopupOtherInfo, subscribePopupOtherInfo] = createSignal<OverlayContextInfo | undefined>(undefined)

  // ── Settings panel visibility signals ──
  const [showPositionSetting, setShowPositionSetting, subscribeShowPositionSetting] = createSignal<boolean>(false)
  const [showOverlaySetting, setShowOverlaySetting, subscribeShowOverlaySetting] = createSignal<boolean>(false)
  const [showSellSetting, setShowSellSetting, subscribeShowSellSetting] = createSignal<boolean>(false)
  const [showTpSetting, setShowTpSetting, subscribeShowTpSetting] = createSignal<boolean>(false)
  const [showSlSetting, setShowSlSetting, subscribeShowSlSetting] = createSignal<boolean>(false)

  // ── Per-instance timeframe-visibility map ──
  const visibilityMap = new Map<string, TimeframeVisibility>()

  // ── Derived helpers ──
  function getOverlayType(): string {
    return popupOverlay()?.name ?? 'Object'
  }

  function openOverlayPopup(pageX: number, pageY: number, overlay: Overlay, others?: OverlayContextInfo): void {
    const screenSize = getScreenSize()
    setPopupTop(screenSize.y - pageY > 200 ? pageY : screenSize.y - 200)
    setPopupLeft(screenSize.x - pageX > 200 ? pageX : screenSize.x - 200)
    setPopupOverlay(overlay)
    setPopupOtherInfo(others)
    setShowOverlayPopup(true)
  }

  function closeOverlayPopup(): void {
    setShowOverlayPopup(false)
  }

  function closeAllSettingPanels(): void {
    setShowOverlayPopup(false)
    setShowPositionSetting(false)
    setShowOverlaySetting(false)
    setShowSellSetting(false)
    setShowTpSetting(false)
    setShowSlSetting(false)
  }

  function resetStore(): void {
    setInstanceApi(null)
    setSymbol(null)
    setPeriod(null)
    setTheme('light')
    setStyles(null)
    setLoadingVisible(false)
    setDrawingBarVisible(false)
    setFullScreen(false)
    setPeriodBarVisible(true)
    setMainIndicators([])
    setSubIndicators({})
    setSelectedOverlay(null)
    setSelectedOverlayPosition({ x: 0, y: 0 })
    setStorageAdapter(null)
    setStorageKey('')
    setOnStorageError(null)
    setAutoSaveDelay(0)
    // Reset feature flags to defaults — clears any runtime overrides.
    featureMap.clear()
    Object.entries(FEATURE_DEFAULTS).forEach(([k, v]) => featureMap.set(k as FeatureFlag, v))
    const snap = featureSnapshot()
    featureListeners.forEach(l => l(snap))
    setIndicatorProvider(null)
    setScriptProvider(null)
    setChartModified(false)
    setRootElementId('')
    setLocale('en-US')
    setTimezone('Etc/UTC')
    setScreenshotUrl('')
    setDebug(true)
    setShowOverlayPopup(false)
    setPopupTop(0)
    setPopupLeft(0)
    setPopupOverlay(undefined)
    setPopupOtherInfo(undefined)
    setShowPositionSetting(false)
    setShowOverlaySetting(false)
    setShowSellSetting(false)
    setShowTpSetting(false)
    setShowSlSetting(false)
    visibilityMap.clear()
  }

  return {
    instanceApi, setInstanceApi, subscribeInstanceApi,
    symbol, setSymbol, subscribeSymbol,
    period, setPeriod, subscribePeriod,
    theme, setTheme, subscribeTheme,
    styles, setStyles, subscribeStyles,
    loadingVisible, setLoadingVisible, subscribeLoadingVisible,
    drawingBarVisible, setDrawingBarVisible, subscribeDrawingBarVisible,
    fullScreen, setFullScreen, subscribeFullScreen,
    periodBarVisible, setPeriodBarVisible, subscribePeriodBarVisible,
    mainIndicators, setMainIndicators, subscribeMainIndicators,
    subIndicators, setSubIndicators, subscribeSubIndicators,
    selectedOverlay, setSelectedOverlay, subscribeSelectedOverlay,
    selectedOverlayPosition, setSelectedOverlayPosition, subscribeSelectedOverlayPosition,
    storageAdapter, setStorageAdapter, subscribeStorageAdapter,
    storageKey, setStorageKey, subscribeStorageKey,
    onStorageError, setOnStorageError,
    autoSaveDelay, setAutoSaveDelay,
    isFeatureEnabled, setFeatureEnabled, subscribeFeatures,
    indicatorProvider, setIndicatorProvider, subscribeIndicatorProvider,
    scriptProvider, setScriptProvider, subscribeScriptProvider,
    chartModified, setChartModified, subscribeChartModified,
    rootElementId, setRootElementId, subscribeRootElementId,
    locale, setLocale, subscribeLocale,
    timezone, setTimezone, subscribeTimezone,
    screenshotUrl, setScreenshotUrl, subscribeScreenshotUrl,
    debug, setDebug, subscribeDebug,
    // Overlay popup
    showOverlayPopup, setShowOverlayPopup, subscribeShowOverlayPopup,
    popupTop, setPopupTop, subscribePopupTop,
    popupLeft, setPopupLeft, subscribePopupLeft,
    popupOverlay, setPopupOverlay, subscribePopupOverlay,
    popupOtherInfo, setPopupOtherInfo, subscribePopupOtherInfo,
    // Settings panels
    showPositionSetting, setShowPositionSetting, subscribeShowPositionSetting,
    showOverlaySetting, setShowOverlaySetting, subscribeShowOverlaySetting,
    showSellSetting, setShowSellSetting, subscribeShowSellSetting,
    showTpSetting, setShowTpSetting, subscribeShowTpSetting,
    showSlSetting, setShowSlSetting, subscribeShowSlSetting,
    // Timeframe visibility map
    getOverlayTimeframeVisibility: (id: string) => visibilityMap.get(id),
    setOverlayTimeframeVisibility: (id: string, visibility: TimeframeVisibility) => { visibilityMap.set(id, visibility) },
    deleteOverlayTimeframeVisibility: (id: string) => { visibilityMap.delete(id) },
    getAllOverlayTimeframeVisibility: () => visibilityMap,
    // Derived helpers
    getOverlayType,
    openOverlayPopup,
    closeOverlayPopup,
    closeAllSettingPanels,
    resetStore,
  }
}
