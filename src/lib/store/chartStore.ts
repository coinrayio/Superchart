/**
 * Chart Store - Global state management for Superchart
 *
 * Follows the pattern from coinray-chart-ui/src/store/chartStore.ts
 * but uses a simple observable pattern that works with any framework.
 */

import type { Chart, DeepPartial, Nullable, Styles, Overlay } from 'klinecharts'
import type { Period, SymbolInfo } from '../types/chart'
import type { StorageAdapter } from '../types/storage'
import type { IndicatorProvider } from '../types/indicator'
import type { ScriptProvider } from '../types/script'

// Simple observable store implementation
type Listener<T> = (value: T) => void

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

// Chart instance
export const [instanceApi, setInstanceApi, subscribeInstanceApi] = createSignal<Nullable<Chart>>(null)

// Symbol and period
export const [symbol, setSymbol, subscribeSymbol] = createSignal<Nullable<SymbolInfo>>(null)
export const [period, setPeriod, subscribePeriod] = createSignal<Nullable<Period>>(null)

// Theme and styles
export const [theme, setTheme, subscribeTheme] = createSignal<string>('light')
export const [styles, setStyles, subscribeStyles] = createSignal<Nullable<DeepPartial<PaneProperties>>>(null)

// UI state
export const [loadingVisible, setLoadingVisible, subscribeLoadingVisible] = createSignal<boolean>(false)
export const [drawingBarVisible, setDrawingBarVisible, subscribeDrawingBarVisible] = createSignal<boolean>(false)
export const [fullScreen, setFullScreen, subscribeFullScreen] = createSignal<boolean>(false)

// Indicators
export const [mainIndicators, setMainIndicators, subscribeMainIndicators] = createSignal<string[]>([])
export const [subIndicators, setSubIndicators, subscribeSubIndicators] = createSignal<Record<string, string>>({})

// Overlays
export const [selectedOverlay, setSelectedOverlay, subscribeSelectedOverlay] = createSignal<Nullable<Overlay>>(null)
export const [selectedOverlayPosition, setSelectedOverlayPosition, subscribeSelectedOverlayPosition] = createSignal<{ x: number; y: number }>({ x: 0, y: 0 })

// Storage
export const [storageAdapter, setStorageAdapter, subscribeStorageAdapter] = createSignal<Nullable<StorageAdapter>>(null)
export const [storageKey, setStorageKey, subscribeStorageKey] = createSignal<string>('')

// Backend indicator provider
export const [indicatorProvider, setIndicatorProvider, subscribeIndicatorProvider] = createSignal<Nullable<IndicatorProvider>>(null)

// Script provider (server-side script execution)
export const [scriptProvider, setScriptProvider, subscribeScriptProvider] = createSignal<Nullable<ScriptProvider>>(null)

// Chart state modification tracking
export const [chartModified, setChartModified, subscribeChartModified] = createSignal<boolean>(false)

// Root element ID for portal mounting
export const [rootElementId, setRootElementId, subscribeRootElementId] = createSignal<string>('')

// Locale and timezone
export const [locale, setLocale, subscribeLocale] = createSignal<string>('en-US')
export const [timezone, setTimezone, subscribeTimezone] = createSignal<string>('Etc/UTC')

// Screenshot URL for modal
export const [screenshotUrl, setScreenshotUrl, subscribeScreenshotUrl] = createSignal<string>('')

// Debug logging (default: false — only errors/warnings printed)
export const [debug, setDebug, subscribeDebug] = createSignal<boolean>(true)

/**
 * Reset all store values to defaults
 */
export function resetStore(): void {
  setInstanceApi(null)
  setSymbol(null)
  setPeriod(null)
  setTheme('light')
  setStyles(null)
  setLoadingVisible(false)
  setDrawingBarVisible(false)
  setFullScreen(false)
  setMainIndicators([])
  setSubIndicators({})
  setSelectedOverlay(null)
  setSelectedOverlayPosition({ x: 0, y: 0 })
  setStorageAdapter(null)
  setStorageKey('')
  setIndicatorProvider(null)
  setScriptProvider(null)
  setChartModified(false)
  setRootElementId('')
  setLocale('en-US')
  setTimezone('Etc/UTC')
  setScreenshotUrl('')
  setDebug(true)
}

/**
 * Get all store subscriptions in one object (useful for React hooks)
 */
export const storeSubscriptions = {
  instanceApi: subscribeInstanceApi,
  symbol: subscribeSymbol,
  period: subscribePeriod,
  theme: subscribeTheme,
  styles: subscribeStyles,
  loadingVisible: subscribeLoadingVisible,
  drawingBarVisible: subscribeDrawingBarVisible,
  fullScreen: subscribeFullScreen,
  mainIndicators: subscribeMainIndicators,
  subIndicators: subscribeSubIndicators,
  selectedOverlay: subscribeSelectedOverlay,
  selectedOverlayPosition: subscribeSelectedOverlayPosition,
  storageAdapter: subscribeStorageAdapter,
  storageKey: subscribeStorageKey,
  indicatorProvider: subscribeIndicatorProvider,
  scriptProvider: subscribeScriptProvider,
  chartModified: subscribeChartModified,
  rootElementId: subscribeRootElementId,
  locale: subscribeLocale,
  timezone: subscribeTimezone,
  screenshotUrl: subscribeScreenshotUrl,
}
