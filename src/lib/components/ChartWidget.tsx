/**
 * ChartWidget - Internal chart component that manages the klinecharts instance
 *
 * Follows the pattern from coinray-chart-ui/src/ChartProComponent.tsx
 */

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useSyncExternalStore } from 'react'
import {
  init,
  dispose,
  utils,
  type Chart,
  type FormatDateParams,
  type DataLoader,
  type Indicator,
  type TooltipFeatureStyle,
  type DeepPartial,
  type Styles,
} from 'klinecharts'
import * as store from '../store/chartStore'
import { useChartState } from '../hooks/useChartState'
import { useBackendIndicators, type UseBackendIndicatorsReturn } from '../hooks/useBackendIndicators'
import { getAllOverlayTimeframeVisibility } from '../store/overlaySettingStore'
import { isOverlayVisibleForPeriod } from '../types/overlay'
import type { Period, SymbolInfo } from '../types/chart'

export interface ChartWidgetProps {
  /** Data loader for fetching OHLC data */
  dataLoader: DataLoader
  /** Watermark text or element */
  watermark?: string | Node
  /** Style overrides */
  styleOverrides?: DeepPartial<Styles>
  /** Called when indicator tooltip feature is clicked */
  onIndicatorTooltipFeatureClick?: (data: {
    paneId: string
    feature: TooltipFeatureStyle
    indicator: Indicator
  }) => void
  /** Callback to expose backend indicator API to parent */
  onBackendIndicatorsReady?: (api: UseBackendIndicatorsReturn) => void
}

export interface ChartWidgetRef {
  /** Resize the chart */
  resize: () => void
  /** Get screenshot URL */
  getScreenshotUrl: (type?: 'png' | 'jpeg', backgroundColor?: string) => string
  /** Get the chart instance */
  getChart: () => Chart | null
}

// Hook to subscribe to store values
function useStoreValue<T>(
  getValue: () => T,
  subscribe: (listener: (value: T) => void) => () => void
): T {
  return useSyncExternalStore(subscribe, getValue, getValue)
}

/**
 * Internal chart widget component
 */
export const ChartWidget = forwardRef<ChartWidgetRef, ChartWidgetProps>(
  ({ dataLoader, watermark, styleOverrides, onIndicatorTooltipFeatureClick, onBackendIndicatorsReady }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const priceUnitRef = useRef<HTMLSpanElement | null>(null)

    // Subscribe to store values
    const symbol = useStoreValue(store.symbol, store.subscribeSymbol)
    const period = useStoreValue(store.period, store.subscribePeriod)
    const theme = useStoreValue(store.theme, store.subscribeTheme)
    const styles = useStoreValue(store.styles, store.subscribeStyles)
    // Subscribe to trigger re-renders on changes (values accessed from store directly)
    useStoreValue(store.mainIndicators, store.subscribeMainIndicators)
    useStoreValue(store.subIndicators, store.subscribeSubIndicators)
    useStoreValue(store.instanceApi, store.subscribeInstanceApi)

    const { createIndicator, restoreChartState } = useChartState()

    // Backend indicator management
    const backendIndicators = useBackendIndicators()

    // Expose backend indicator API to parent
    useEffect(() => {
      onBackendIndicatorsReady?.(backendIndicators)
    }, [onBackendIndicatorsReady, backendIndicators])

    // Track previous symbol/period for change detection
    const prevSymbolPeriodRef = useRef<{ symbol: SymbolInfo | null; period: Period | null }>({
      symbol: null,
      period: null,
    })

    /**
     * Format date based on period type
     */
    const formatDate = useCallback(
      (params: FormatDateParams): string => {
        const currentPeriod = store.period()

        if (!currentPeriod) {
          return utils.formatDate(params.dateTimeFormat, params.timestamp, 'YYYY-MM-DD HH:mm')
        }

        switch (currentPeriod.type) {
          case 'minute':
            if (params.type === 'xAxis') {
              return utils.formatDate(params.dateTimeFormat, params.timestamp, 'HH:mm')
            }
            return utils.formatDate(params.dateTimeFormat, params.timestamp, 'YYYY-MM-DD HH:mm')

          case 'hour':
            if (params.type === 'xAxis') {
              return utils.formatDate(params.dateTimeFormat, params.timestamp, 'MM-DD HH:mm')
            }
            return utils.formatDate(params.dateTimeFormat, params.timestamp, 'YYYY-MM-DD HH:mm')

          case 'day':
          case 'week':
            return utils.formatDate(params.dateTimeFormat, params.timestamp, 'YYYY-MM-DD')

          case 'month':
            if (params.type === 'xAxis') {
              return utils.formatDate(params.dateTimeFormat, params.timestamp, 'YYYY-MM')
            }
            return utils.formatDate(params.dateTimeFormat, params.timestamp, 'YYYY-MM-DD')

          case 'year':
            if (params.type === 'xAxis') {
              return utils.formatDate(params.dateTimeFormat, params.timestamp, 'YYYY')
            }
            return utils.formatDate(params.dateTimeFormat, params.timestamp, 'YYYY-MM-DD')

          default:
            return utils.formatDate(params.dateTimeFormat, params.timestamp, 'YYYY-MM-DD HH:mm')
        }
      },
      []
    )

    // Keep a ref to the external handler so the subscribeAction callback never goes stale
    const onIndicatorTooltipFeatureClickRef = useRef(onIndicatorTooltipFeatureClick)
    useEffect(() => {
      onIndicatorTooltipFeatureClickRef.current = onIndicatorTooltipFeatureClick
    }, [onIndicatorTooltipFeatureClick])

    /**
     * Handle indicator tooltip feature click.
     * Defined with no deps so the same function reference is registered with
     * subscribeAction for the lifetime of the chart — the ref above ensures we
     * always call the latest external handler without stale-closure bugs.
     */
    const handleIndicatorTooltipFeatureClick = useCallback(
      (data: unknown) => {
        const { paneId, feature, indicator } = data as {
          paneId: string
          feature: TooltipFeatureStyle
          indicator: Indicator
        }

        const chart = store.instanceApi()

        // Call external handler if provided (always reads latest via ref)
        onIndicatorTooltipFeatureClickRef.current?.({ paneId, feature, indicator })

        // Handle built-in features
        switch (feature.id) {
          case 'visible':
            chart?.overrideIndicator({ name: indicator.name, visible: true, paneId })
            break

          case 'invisible':
            chart?.overrideIndicator({ name: indicator.name, visible: false, paneId })
            break

          case 'close':
            if (paneId === 'candle_pane') {
              const currentMainIndicators = store.mainIndicators()
              chart?.removeIndicator({ paneId, name: indicator.name, id: indicator.id })
              const index = currentMainIndicators.indexOf(indicator.name)
              if (index >= 0) {
                const newMainIndicators = [...currentMainIndicators]
                newMainIndicators.splice(index, 1)
                store.setMainIndicators(newMainIndicators)
              }
            } else {
              const currentSubIndicators = store.subIndicators()
              chart?.removeIndicator({ paneId, name: indicator.name, id: indicator.id })
              const newSubIndicators = { ...currentSubIndicators }
              delete newSubIndicators[indicator.name]
              store.setSubIndicators(newSubIndicators)
            }
            break
        }
      },
      [] // stable — reads external handler via ref
    )

    /**
     * Handle resize
     */
    const handleResize = useCallback(() => {
      store.instanceApi()?.resize()
    }, [])

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        resize: () => store.instanceApi()?.resize(),
        getScreenshotUrl: (type = 'jpeg', backgroundColor) =>
          store.instanceApi()?.getConvertPictureUrl(true, type, backgroundColor) ?? '',
        getChart: () => store.instanceApi(),
      }),
      []
    )

    // Initialize chart on mount
    useEffect(() => {
      if (!containerRef.current) return

      // Create chart instance
      const chart = init(containerRef.current, {
        formatter: {
          formatDate,
        },
        debug: store.debug(),
      })

      if (!chart) return

      store.setInstanceApi(chart)

      // Setup watermark
      const watermarkContainer = chart.getDom('candle_pane', 'main')
      if (watermarkContainer && watermark) {
        const watermarkEl = document.createElement('div')
        watermarkEl.className = 'superchart-watermark'
        if (typeof watermark === 'string') {
          watermarkEl.innerHTML = watermark.trim()
        } else {
          watermarkEl.appendChild(watermark)
        }
        watermarkContainer.appendChild(watermarkEl)
      }

      // Setup price unit display
      const priceUnitContainer = chart.getDom('candle_pane', 'yAxis')
      if (priceUnitContainer) {
        const priceUnitEl = document.createElement('span')
        priceUnitEl.className = 'superchart-price-unit'
        priceUnitContainer.appendChild(priceUnitEl)
        priceUnitRef.current = priceUnitEl
      }

      // Configure chart behavior
      chart.setZoomAnchor({ main: 'last_bar', xAxis: 'last_bar' })
      chart.setBarSpaceLimit({ max: 400 })

      // Subscribe to chart actions
      chart.subscribeAction('onIndicatorTooltipFeatureClick', handleIndicatorTooltipFeatureClick)

      // Setup resize listener
      window.addEventListener('resize', handleResize)

      // Restore saved state
      restoreChartState()

      // Restore backend indicators from storage (after chart state)
      backendIndicators.restoreBackendIndicators()

      // Set symbol and period from store
      const currentSymbol = store.symbol()
      const currentPeriod = store.period()

      if (currentSymbol) {
        chart.setSymbol({
          ticker: currentSymbol.ticker,
          pricePrecision: currentSymbol.pricePrecision ?? 2,
          volumePrecision: currentSymbol.volumePrecision ?? 0,
        })

        // Update price unit display
        if (priceUnitRef.current) {
          if (currentSymbol.priceCurrency) {
            priceUnitRef.current.textContent = currentSymbol.priceCurrency.toUpperCase()
            priceUnitRef.current.style.display = 'flex'
          } else {
            priceUnitRef.current.style.display = 'none'
          }
        }
      }

      if (currentPeriod) {
        chart.setPeriod(currentPeriod)
      }

      // Set data loader
      chart.setDataLoader(dataLoader)

      // Apply style overrides
      if (styleOverrides) {
        chart.setStyles(styleOverrides)
      }

      // Create initial indicators
      const initialMainIndicators = store.mainIndicators()
      initialMainIndicators.forEach((indicatorName) => {
        createIndicator(indicatorName, true, { id: 'candle_pane' })
      })

      // Cleanup on unmount
      return () => {
        backendIndicators.disposeAll()
        window.removeEventListener('resize', handleResize)
        if (containerRef.current) {
          dispose(containerRef.current)
        }
        store.setInstanceApi(null)
      }
    }, []) // Only run on mount

    // Handle theme changes
    useEffect(() => {
      const chart = store.instanceApi()
      if (!chart) return

      chart.setStyles(theme)

      // Update indicator tooltip icons color based on theme
      const color = theme === 'dark' ? '#929AA5' : '#76808F'
      chart.setStyles({
        indicator: {
          tooltip: {
            features: [
              createTooltipFeature('visible', '\ue903', color),
              createTooltipFeature('invisible', '\ue901', color),
              createTooltipFeature('setting', '\ue902', color),
              createTooltipFeature('close', '\ue900', color),
              createTooltipFeature('code', '{}', color, 'monospace'),
            ],
          },
        },
      })
    }, [theme])

    // Handle styles changes
    useEffect(() => {
      const chart = store.instanceApi()
      if (chart && styles) {
        chart.setStyles(styles)
      }
    }, [styles])

    // Handle symbol/period changes
    useEffect(() => {
      const chart = store.instanceApi()
      if (!chart || !symbol || !period) return

      const prev = prevSymbolPeriodRef.current

      // Check if period changed
      if (prev.period?.span !== period.span || prev.period?.type !== period.type) {
        chart.setPeriod(period)

        // Apply timeframe visibility filtering to all overlays
        const visibilityMap = getAllOverlayTimeframeVisibility()
        if (visibilityMap.size > 0) {
          visibilityMap.forEach((visibility, overlayId) => {
            const shouldBeVisible = isOverlayVisibleForPeriod(visibility, period)
            chart.overrideOverlay({ id: overlayId, visible: shouldBeVisible })
          })
        }
      }

      // Check if symbol changed
      if (prev.symbol?.ticker !== symbol.ticker) {
        chart.setSymbol({
          ticker: symbol.ticker,
          pricePrecision: symbol.pricePrecision ?? 2,
          volumePrecision: symbol.volumePrecision ?? 0,
        })

        // Update price unit display
        if (priceUnitRef.current) {
          if (symbol.priceCurrency) {
            priceUnitRef.current.textContent = symbol.priceCurrency.toUpperCase()
            priceUnitRef.current.style.display = 'flex'
          } else {
            priceUnitRef.current.style.display = 'none'
          }
        }
      }

      // Resubscribe backend indicators on symbol/period change
      if (prev.symbol && prev.period) {
        backendIndicators.handleSymbolPeriodChange()
      }

      prevSymbolPeriodRef.current = { symbol, period }
    }, [symbol, period])

    return (
      <div
        ref={containerRef}
        className="superchart-widget"
        style={{ width: '100%', height: '100%' }}
      />
    )
  }
)

ChartWidget.displayName = 'ChartWidget'

/**
 * Helper to create tooltip feature style
 */
function createTooltipFeature(
  id: string,
  code: string,
  color: string,
  family = 'icomoon'
): TooltipFeatureStyle {
  return {
    id,
    position: 'middle',
    marginLeft: id === 'visible' || id === 'invisible' ? 8 : 6,
    marginTop: 1,
    marginRight: 0,
    marginBottom: 0,
    paddingLeft: 0,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    type: 'icon_font',
    content: {
      code,
      family,
    },
    size: 14,
    color,
    activeColor: color,
    backgroundColor: 'transparent',
    activeBackgroundColor: 'rgba(22, 119, 255, 0.15)',
    borderRadius: 0,
  }
}
