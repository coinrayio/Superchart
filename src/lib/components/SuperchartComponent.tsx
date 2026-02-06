/**
 * SuperchartComponent - Internal React component
 *
 * This is the internal React component that renders the chart UI with all widgets and modals.
 * Follows the pattern from coinray-chart-ui/src/ChartProComponent.tsx
 */

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import type {
  DataLoader,
  DeepPartial,
  Styles,
  OverlayMode,
} from 'klinecharts'
import { ChartWidget, type ChartWidgetRef } from './ChartWidget'
import type { UseBackendIndicatorsReturn } from '../hooks/useBackendIndicators'
import type { Period, SymbolInfo } from '../types/chart'
import type { SuperchartApi } from './Superchart'
import * as store from '../store/chartStore'
import { useChartState } from '../hooks/useChartState'
import { translateTimezone } from '../widget/timezone-modal/data'

// Import all widgets
import PeriodBar from '../widget/period-bar'
import DrawingBar from '../widget/drawing-bar'
import IndicatorModal from '../widget/indicator-modal'
import IndicatorSettingModal from '../widget/indicator-setting-modal'
import TimezoneModal from '../widget/timezone-modal'
import SettingModal from '../widget/setting-modal'
import ScreenshotModal from '../widget/screenshot-modal'
import SymbolSearchModal from '../widget/symbol-search-modal'
import SettingFloating from '../widget/setting-floating'
import { Loading } from '../component'

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

interface TimezoneData {
  key: string
  text: string
}

export function SuperchartComponent(props: SuperchartComponentProps) {
  const {
    onApiReady,
    dataLoader,
    watermark,
    styleOverrides,
    // showDrawingBar and showVolume are passed from Superchart but not used here
    // Drawing bar visibility is controlled by store.drawingBarVisible
    // Volume indicator is added via mainIndicators in store
    periods,
    loadingComponent,
    className,
  } = props

  const chartWidgetRef = useRef<ChartWidgetRef>(null)

  // Subscribe to store values
  const symbol = useStoreValue(store.symbol, store.subscribeSymbol)
  const period = useStoreValue(store.period, store.subscribePeriod)
  const theme = useStoreValue(store.theme, store.subscribeTheme)
  const locale = useStoreValue(store.locale, store.subscribeLocale)
  const loadingVisible = useStoreValue(store.loadingVisible, store.subscribeLoadingVisible)
  const drawingBarVisible = useStoreValue(store.drawingBarVisible, store.subscribeDrawingBarVisible)
  const selectedOverlay = useStoreValue(store.selectedOverlay, store.subscribeSelectedOverlay)
  const mainIndicators = useStoreValue(store.mainIndicators, store.subscribeMainIndicators)
  const subIndicators = useStoreValue(store.subIndicators, store.subscribeSubIndicators)

  // Debug logging
  // useEffect(() => {
  //   console.log('[SuperchartComponent] Render state:', { symbol, period, theme, locale })
  // }, [symbol, period, theme, locale])

  const { createIndicator, pushOverlay } = useChartState()

  // Modal visibility states
  const [indicatorModalVisible, setIndicatorModalVisible] = useState(false)
  const [timezoneModalVisible, setTimezoneModalVisible] = useState(false)
  const [settingModalVisible, setSettingModalVisible] = useState(false)
  const [screenshotUrl, setScreenshotUrl] = useState('')
  const [symbolSearchModalVisible, setSymbolSearchModalVisible] = useState(false)
  const [indicatorSettingModalParams, setIndicatorSettingModalParams] = useState<{
    visible: boolean
    indicatorName: string
    paneId: string
    calcParams: any[]
  }>({
    visible: false,
    indicatorName: '',
    paneId: '',
    calcParams: [],
  })

  // Timezone state
  const [timezone, setTimezone] = useState<TimezoneData>({
    key: store.timezone(),
    text: translateTimezone(store.timezone(), locale),
  })

  // Widget default styles for reset
  const [widgetDefaultStyles, setWidgetDefaultStyles] = useState<Styles>()

  // Backend indicator API (received from ChartWidget)
  const [backendApi, setBackendApi] = useState<UseBackendIndicatorsReturn | null>(null)
  const handleBackendIndicatorsReady = useCallback((api: UseBackendIndicatorsReturn) => {
    setBackendApi(api)
  }, [])

  // Update timezone text when locale changes
  useEffect(() => {
    setTimezone(prev => ({
      key: prev.key,
      text: translateTimezone(prev.key, locale)
    }))
  }, [locale])

  // Store default styles for reset functionality
  useEffect(() => {
    const chart = store.instanceApi()
    if (chart) {
      setWidgetDefaultStyles(JSON.parse(JSON.stringify(chart.getStyles())))
    }
  }, [])

  // Handle indicator tooltip feature clicks
  const handleIndicatorTooltipFeatureClick = useCallback((data: {
    paneId: string
    feature: { id: string }
    indicator: { name: string; id?: string }
  }) => {
    const chart = store.instanceApi()
    if (!chart) return

    switch (data.feature.id) {
      case 'visible':
        chart.overrideIndicator({ name: data.indicator.name, visible: true, paneId: data.paneId })
        break

      case 'invisible':
        chart.overrideIndicator({ name: data.indicator.name, visible: false, paneId: data.paneId })
        break

      case 'setting': {
        const indicators = chart.getIndicators({
          paneId: data.paneId,
          name: data.indicator.name,
          id: data.indicator.id,
        })
        const indicator = indicators[0]
        if (!indicator) return
        setIndicatorSettingModalParams({
          visible: true,
          indicatorName: data.indicator.name,
          paneId: data.paneId,
          calcParams: indicator.calcParams,
        })
        break
      }

      case 'close': {
        if (data.paneId === 'candle_pane') {
          const newMainIndicators = [...mainIndicators]
          chart.removeIndicator({
            paneId: data.paneId,
            name: data.indicator.name,
            id: data.indicator.id,
          })
          const index = newMainIndicators.indexOf(data.indicator.name)
          if (index >= 0) {
            newMainIndicators.splice(index, 1)
            store.setMainIndicators(newMainIndicators)
          }
        } else {
          const newSubIndicators = { ...subIndicators }
          chart.removeIndicator({
            paneId: data.paneId,
            name: data.indicator.name,
            id: data.indicator.id,
          })
          delete newSubIndicators[data.indicator.name]
          store.setSubIndicators(newSubIndicators)
        }
        break
      }
    }
  }, [mainIndicators, subIndicators])

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
        setTimezone({
          key: newTimezone,
          text: translateTimezone(newTimezone, locale),
        })
      },
      getTimezone: () => timezone.key,
      setSymbol: (newSymbol: SymbolInfo) => {
        store.setSymbol(newSymbol)
        store.instanceApi()?.setSymbol({
          ticker: newSymbol.ticker,
          pricePrecision: newSymbol.pricePrecision,
          volumePrecision: newSymbol.volumePrecision,
        })
      },
      getSymbol: () => symbol!,
      setPeriod: (newPeriod: Period) => {
        store.setPeriod(newPeriod)
        store.instanceApi()?.setPeriod(newPeriod)
      },
      getPeriod: () => period!,
      getChart: () => store.instanceApi(),
      resize: () => store.instanceApi()?.resize(),
      getScreenshotUrl: (type, backgroundColor) =>
        chartWidgetRef.current?.getScreenshotUrl(type, backgroundColor) ?? '',
      createOverlay: (overlay, paneId) => pushOverlay(overlay, paneId),
      setOverlayMode: (mode) => store.instanceApi()?.overrideOverlay({ mode }),
      getBackendIndicators: () => backendApi,
      dispose: () => {},
    }

    onApiReady(api)
  }, [onApiReady, pushOverlay, backendApi, timezone, symbol, period, locale])

  console.log('[SuperchartComponent] About to render. symbol:', symbol, 'period:', period)

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
      {/* Period Bar - Main toolbar - only render when we have data */}
      {symbol && period && (
        <PeriodBar
        locale={locale}
        symbol={symbol}
        spread={drawingBarVisible}
        period={period}
        periods={periods ?? [
          { type: 'minute', span: 1, text: '1m' },
          { type: 'minute', span: 5, text: '5m' },
          { type: 'minute', span: 15, text: '15m' },
          { type: 'hour', span: 1, text: '1H' },
          { type: 'hour', span: 2, text: '2H' },
          { type: 'hour', span: 4, text: '4H' },
          { type: 'day', span: 1, text: 'D' },
          { type: 'week', span: 1, text: 'W' },
          { type: 'month', span: 1, text: 'M' },
        ]}
        onMenuClick={() => {
          store.setDrawingBarVisible(!drawingBarVisible)
          setTimeout(() => store.instanceApi()?.resize(), 0)
        }}
        onSymbolClick={() => setSymbolSearchModalVisible(!symbolSearchModalVisible)}
        onPeriodChange={(newPeriod) => store.setPeriod(newPeriod)}
        onIndicatorClick={() => setIndicatorModalVisible(!indicatorModalVisible)}
        onTimezoneClick={() => setTimezoneModalVisible(!timezoneModalVisible)}
        onSettingClick={() => setSettingModalVisible(!settingModalVisible)}
        onScreenshotClick={() => {
          const chart = store.instanceApi()
          if (chart) {
            const url = chart.getConvertPictureUrl(
              true,
              'jpeg',
              theme === 'dark' ? '#151517' : '#ffffff'
            )
            setScreenshotUrl(url)
          }
        }}
        />
      )}

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
        {loadingVisible && (
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
            {loadingComponent ?? <Loading />}
          </div>
        )}

        {/* Drawing bar */}
        {drawingBarVisible && (
          <DrawingBar
            locale={locale}
            onDrawingItemClick={(overlay) => pushOverlay(overlay)}
            onModeChange={(mode) => store.instanceApi()?.overrideOverlay({ mode: mode as OverlayMode })}
            onLockChange={(lock) => store.instanceApi()?.overrideOverlay({ lock })}
            onVisibleChange={(visible) => store.instanceApi()?.overrideOverlay({ visible })}
            onRemoveClick={(groupId) => store.instanceApi()?.removeOverlay({ groupId })}
          />
        )}

        {/* Settings floating (for overlay editing) */}
        {selectedOverlay && <SettingFloating locale={locale} />}

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
            onIndicatorTooltipFeatureClick={handleIndicatorTooltipFeatureClick}
            onBackendIndicatorsReady={handleBackendIndicatorsReady}
          />
        </div>
      </div>

      {/* Modals */}
      {indicatorModalVisible && (
        <IndicatorModal
          locale={locale}
          mainIndicators={mainIndicators}
          subIndicators={subIndicators}
          backendIndicators={backendApi?.availableIndicators}
          activeBackendIndicators={backendApi?.activeIndicatorNames}
          onMainIndicatorChange={(data) => {
            const newMainIndicators = [...mainIndicators]
            const chart = store.instanceApi()
            if (!chart) return

            if (data.added) {
              createIndicator(data.name, true, { id: 'candle_pane' })
              newMainIndicators.push(data.name)
            } else {
              chart.removeIndicator({ name: data.name, paneId: 'candle_pane', id: data.id })
              const index = newMainIndicators.indexOf(data.name)
              if (index >= 0) {
                newMainIndicators.splice(index, 1)
              }
            }
            store.setMainIndicators(newMainIndicators)
          }}
          onSubIndicatorChange={(data) => {
            const newSubIndicators = { ...subIndicators }
            const chart = store.instanceApi()
            if (!chart) return

            if (data.added) {
              const id = createIndicator(data.name)
              if (id) {
                newSubIndicators[data.name] = id
              }
            } else {
              if (data.id) {
                chart.removeIndicator({ name: data.name, id: data.id })
                delete newSubIndicators[data.name]
              }
            }
            store.setSubIndicators(newSubIndicators)
          }}
          onBackendIndicatorToggle={async (definition, added) => {
            if (added) {
              await backendApi?.addBackendIndicator(definition)
            } else {
              await backendApi?.removeBackendIndicator(definition.name)
            }
          }}
          onClose={() => setIndicatorModalVisible(false)}
        />
      )}

      {symbolSearchModalVisible && (
        <SymbolSearchModal
          locale={locale}
          datafeed={dataLoader as any}
          onSymbolSelected={(newSymbol) => {
            store.setSymbol({
              ...newSymbol,
              pricePrecision: newSymbol.pricePrecision ?? 2,
              volumePrecision: newSymbol.volumePrecision ?? 0,
            })
            setSymbolSearchModalVisible(false)
          }}
          onClose={() => setSymbolSearchModalVisible(false)}
        />
      )}

      {timezoneModalVisible && (
        <TimezoneModal
          locale={locale}
          timezone={timezone}
          onClose={() => setTimezoneModalVisible(false)}
          onConfirm={(newTimezone) => {
            const tz = { key: newTimezone.key, text: String(newTimezone.text) }
            setTimezone(tz)
            store.setTimezone(tz.key)
            store.instanceApi()?.setTimezone(tz.key)
            setTimezoneModalVisible(false)
          }}
        />
      )}

      {settingModalVisible && (
        <SettingModal
          locale={locale}
          currentStyles={JSON.parse(JSON.stringify(store.instanceApi()?.getStyles() ?? {}))}
          onClose={() => setSettingModalVisible(false)}
          onChange={(style) => {
            store.instanceApi()?.setStyles(style)
          }}
          onRestoreDefault={(options) => {
            const style: any = {}
            options.forEach((option) => {
              const key = option.key
              // Simple path-based value retrieval
              const keys = key.split('.')
              let value = widgetDefaultStyles as any
              for (const k of keys) {
                value = value?.[k]
              }
              // Simple path-based setter
              let target = style
              for (let i = 0; i < keys.length - 1; i++) {
                if (!target[keys[i]]) {
                  target[keys[i]] = {}
                }
                target = target[keys[i]]
              }
              target[keys[keys.length - 1]] = value
            })
            store.instanceApi()?.setStyles(style)
          }}
        />
      )}

      {screenshotUrl && (
        <ScreenshotModal
          locale={locale}
          url={screenshotUrl}
          onClose={() => setScreenshotUrl('')}
        />
      )}

      {indicatorSettingModalParams.visible && (
        <IndicatorSettingModal
          locale={locale}
          params={indicatorSettingModalParams}
          onClose={() =>
            setIndicatorSettingModalParams({
              visible: false,
              indicatorName: '',
              paneId: '',
              calcParams: [],
            })
          }
          onConfirm={(params) => {
            const chart = store.instanceApi()
            if (chart) {
              chart.overrideIndicator({
                name: indicatorSettingModalParams.indicatorName,
                calcParams: params,
                paneId: indicatorSettingModalParams.paneId,
              })
            }
            setIndicatorSettingModalParams({
              visible: false,
              indicatorName: '',
              paneId: '',
              calcParams: [],
            })
          }}
        />
      )}
    </div>
  )
}

export default SuperchartComponent
