/**
 * SuperchartComponent - Internal React component
 *
 * This is the internal React component that renders the chart UI.
 * It's used by the class-based Superchart for framework-agnostic usage.
 * Follows the pattern from coinray-chart-ui/src/ChartProComponent.tsx
 */

import {
  useRef,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import type {
  DataLoader,
  DeepPartial,
  Styles,
} from 'klinecharts'
import { ChartWidget, type ChartWidgetRef } from './ChartWidget'
import type { Period, SymbolInfo } from '../types/chart'
import type { SuperchartApi } from './Superchart'
import * as store from '../store/chartStore'
import { useChartState } from '../hooks/useChartState'

export interface SuperchartComponentProps {
  /** Ref callback to expose API */
  onApiReady: (api: SuperchartApi) => void
  /** Data loader for fetching OHLC data */
  dataLoader: DataLoader
  /** Watermark text or element */
  watermark?: string | Node
  /** Style overrides */
  styleOverrides?: DeepPartial<Styles>
  /** Show drawing toolbar */
  showDrawingBar?: boolean
  /** Show volume indicator */
  showVolume?: boolean
  /** Available period options */
  periods?: Period[]
  /** Custom toolbar component */
  toolbar?: ReactNode
  /** Custom drawing bar component */
  drawingBar?: ReactNode
  /** Loading component */
  loadingComponent?: ReactNode
  /** Container className */
  className?: string
}

// Hook to subscribe to store values
function useStoreValue<T>(
  getValue: () => T,
  subscribe: (listener: (value: T) => void) => () => void
): T {
  return useSyncExternalStore(
    subscribe,
    getValue,
    getValue
  )
}

export function SuperchartComponent(props: SuperchartComponentProps) {
  const {
    onApiReady,
    dataLoader,
    watermark,
    styleOverrides,
    showDrawingBar = false,
    toolbar,
    drawingBar,
    loadingComponent,
    className,
  } = props

  const chartWidgetRef = useRef<ChartWidgetRef>(null)

  // Subscribe to store values (values accessed from store directly to trigger reactivity)
  useStoreValue(store.symbol, store.subscribeSymbol)
  useStoreValue(store.period, store.subscribePeriod)
  const theme = useStoreValue(store.theme, store.subscribeTheme)
  useStoreValue(store.styles, store.subscribeStyles)
  const loadingVisible = useStoreValue(store.loadingVisible, store.subscribeLoadingVisible)
  const drawingBarVisible = useStoreValue(store.drawingBarVisible, store.subscribeDrawingBarVisible)

  const { pushOverlay } = useChartState()

  // Expose API on mount
  useEffect(() => {
    const api: SuperchartApi = {
      setTheme: (newTheme: string) => {
        store.setTheme(newTheme)
        store.instanceApi()?.setStyles(newTheme)
      },
      getTheme: () => store.theme(),
      setStyles: (newStyles: DeepPartial<Styles>) => {
        store.setStyles(newStyles)
        store.instanceApi()?.setStyles(newStyles)
      },
      getStyles: () => store.styles() ?? {},
      setLocale: (newLocale: string) => {
        store.setLocale(newLocale)
        store.instanceApi()?.setLocale(newLocale)
      },
      getLocale: () => store.locale(),
      setTimezone: (newTimezone: string) => {
        store.setTimezone(newTimezone)
        store.instanceApi()?.setTimezone(newTimezone)
      },
      getTimezone: () => store.timezone(),
      setSymbol: (newSymbol: SymbolInfo) => {
        store.setSymbol(newSymbol)
        store.instanceApi()?.setSymbol({
          ticker: newSymbol.ticker,
          pricePrecision: newSymbol.pricePrecision,
          volumePrecision: newSymbol.volumePrecision,
        })
      },
      getSymbol: () => store.symbol()!,
      setPeriod: (newPeriod: Period) => {
        store.setPeriod(newPeriod)
        store.instanceApi()?.setPeriod(newPeriod)
      },
      getPeriod: () => store.period()!,
      getChart: () => store.instanceApi(),
      resize: () => store.instanceApi()?.resize(),
      getScreenshotUrl: (type, backgroundColor) =>
        chartWidgetRef.current?.getScreenshotUrl(type, backgroundColor) ?? '',
      createOverlay: (overlay, paneId) => pushOverlay(overlay, paneId),
      setOverlayMode: (mode) => store.instanceApi()?.overrideOverlay({ mode }),
      dispose: () => {},
    }

    onApiReady(api)
  }, [onApiReady, pushOverlay])

  return (
    <div
      className={`superchart ${className ?? ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
      }}
      data-theme={theme}
    >
      {/* Toolbar area */}
      {toolbar}

      {/* Main content area */}
      <div
        className="superchart-content"
        style={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
          position: 'relative',
        }}
      >
        {/* Loading overlay */}
        {loadingVisible && loadingComponent && (
          <div
            className="superchart-loading"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 100,
            }}
          >
            {loadingComponent}
          </div>
        )}

        {/* Drawing bar */}
        {showDrawingBar && drawingBarVisible && drawingBar}

        {/* Chart widget */}
        <div
          className="superchart-chart-container"
          style={{
            flex: 1,
            minWidth: 0,
            position: 'relative',
          }}
        >
          <ChartWidget
            ref={chartWidgetRef}
            dataLoader={dataLoader}
            watermark={watermark}
            styleOverrides={styleOverrides}
          />
        </div>
      </div>
    </div>
  )
}

export default SuperchartComponent
