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
import { log } from '../utils/log'
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
import OverlayOptionsPopup from '../component/popup/overlay'
import OverlaySettingModal from '../widget/overlay'
import { ScriptEditor } from '../widget/script-editor'
import { Loading } from '../component'
import {
  showOverlayPopup,
  subscribeShowOverlayPopup,
  showOverlaySetting,
  subscribeShowOverlaySetting,
} from '../store/overlaySettingStore'

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
  const periodBarVisible = useStoreValue(store.periodBarVisible, store.subscribePeriodBarVisible)
  const selectedOverlay = useStoreValue(store.selectedOverlay, store.subscribeSelectedOverlay)
  const overlayPopupVisible = useStoreValue(showOverlayPopup, subscribeShowOverlayPopup)
  const overlaySettingVisible = useStoreValue(showOverlaySetting, subscribeShowOverlaySetting)
  const mainIndicators = useStoreValue(store.mainIndicators, store.subscribeMainIndicators)
  const subIndicators = useStoreValue(store.subIndicators, store.subscribeSubIndicators)

  // Debug logging
  // useEffect(() => {
  //   log('[SuperchartComponent] Render state:', { symbol, period, theme, locale })
  // }, [symbol, period, theme, locale])


  const { createIndicator, pushOverlay } = useChartState()

  // Modal visibility states
  const [indicatorModalVisible, setIndicatorModalVisible] = useState(false)
  const [timezoneModalVisible, setTimezoneModalVisible] = useState(false)
  const [settingModalVisible, setSettingModalVisible] = useState(false)
  const [screenshotUrl, setScreenshotUrl] = useState('')
  const [symbolSearchModalVisible, setSymbolSearchModalVisible] = useState(false)
  const [scriptEditorVisible, setScriptEditorVisible] = useState(false)
  const [readOnlyEditorVisible, setReadOnlyEditorVisible] = useState(false)
  const [readOnlyEditorCode, setReadOnlyEditorCode] = useState('')
  const pendingCloneCodeRef = useRef('')
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

  // Custom toolbar container refs (populated after PeriodBar mounts)
  const toolbarLeftRef = useRef<HTMLElement | null>(null)
  const toolbarRightRef = useRef<HTMLElement | null>(null)
  const handleToolbarReady = useCallback((left: HTMLElement, right: HTMLElement) => {
    toolbarLeftRef.current = left
    toolbarRightRef.current = right
  }, [])

  // Backend indicator API (received from ChartWidget)
  const [backendApi, setBackendApi] = useState<UseBackendIndicatorsReturn | null>(null)
  const handleBackendIndicatorsReady = useCallback((api: UseBackendIndicatorsReturn) => {
    setBackendApi(api)
  }, [])

  // Check if script provider is available
  const scriptProvider = store.scriptProvider()

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
        // Backend indicators: remove subscription (klinecharts removal handled in ChartWidget)
        if (data.indicator.name.startsWith('BACKEND_')) {
          const active = backendApi?.getActiveIndicatorByKlinechartsName(data.indicator.name)
          if (active) backendApi?.removeBackendIndicator(active.name).catch(console.error)
        } else if (data.indicator.name.startsWith('SCRIPT_')) {
          // Script editor indicators: stop server-side execution + remove from chart
          const scriptId = data.indicator.name.slice('SCRIPT_'.length)
          store.scriptProvider()?.stop(scriptId).catch(console.error)
          chart.removeIndicator({
            paneId: data.paneId,
            name: data.indicator.name,
            id: data.indicator.id,
          })
        } else if (data.paneId === 'candle_pane') {
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

      case 'code': {
        const active = backendApi?.getActiveIndicatorByKlinechartsName(data.indicator.name)
        if (!active) return
        const provider = store.indicatorProvider()
        if (!provider?.getIndicatorCode) return
        provider.getIndicatorCode(active.name).then((code: string) => {
          setReadOnlyEditorCode(code)
          setReadOnlyEditorVisible(true)
        }).catch((err: Error) => {
          console.error('[SuperchartComponent] Failed to fetch indicator code:', err)
        })
        break
      }
    }
  }, [mainIndicators, subIndicators, backendApi])

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
      openScriptEditor: (options) => {
        if (options?.readOnly) {
          setReadOnlyEditorCode(options.initialCode ?? '')
          setReadOnlyEditorVisible(true)
        } else {
          pendingCloneCodeRef.current = options?.initialCode ?? ''
          setScriptEditorVisible(true)
        }
      },
      closeScriptEditor: () => {
        setScriptEditorVisible(false)
        setReadOnlyEditorVisible(false)
        pendingCloneCodeRef.current = ''
      },
      setPeriodBarVisible: (visible) => store.setPeriodBarVisible(visible),
      createButton: (options) => {
        const container = options?.align === 'left'
          ? toolbarLeftRef.current
          : toolbarRightRef.current
        const btn = document.createElement('button')
        btn.className = 'superchart-toolbar-btn'
        if (options?.icon) {
          const iconSpan = document.createElement('span')
          iconSpan.innerHTML = options.icon
          btn.appendChild(iconSpan)
        }
        if (options?.text) {
          const textSpan = document.createElement('span')
          textSpan.textContent = options.text
          btn.appendChild(textSpan)
        }
        if (options?.tooltip) btn.title = options.tooltip
        if (options?.onClick) btn.addEventListener('click', options.onClick)
        container?.appendChild(btn)
        return btn
      },
      createDropdown: (options) => {
        const container = options?.align === 'left'
          ? toolbarLeftRef.current
          : toolbarRightRef.current

        const trigger = document.createElement('div')
        trigger.className = 'superchart-toolbar-btn'
        trigger.style.cursor = 'pointer'
        if (options?.icon) {
          const iconSpan = document.createElement('span')
          iconSpan.innerHTML = options.icon
          trigger.appendChild(iconSpan)
        }
        if (options?.text) {
          const textSpan = document.createElement('span')
          textSpan.textContent = options.text
          trigger.appendChild(textSpan)
        }
        const chevron = document.createElement('span')
        chevron.className = 'superchart-toolbar-dropdown-chevron'
        chevron.textContent = '▾'
        trigger.appendChild(chevron)
        if (options?.tooltip) trigger.title = options.tooltip

        let dropdownEl: HTMLElement | null = null

        const close = () => {
          dropdownEl?.remove()
          dropdownEl = null
          document.removeEventListener('mousedown', onOutside)
        }

        const onOutside = (e: MouseEvent) => {
          if (!dropdownEl?.contains(e.target as Node) && !trigger.contains(e.target as Node)) {
            close()
          }
        }

        trigger.addEventListener('click', () => {
          if (dropdownEl) { close(); return }

          dropdownEl = document.createElement('div')
          dropdownEl.className = 'superchart-toolbar-dropdown-list'

          const rect = trigger.getBoundingClientRect()
          dropdownEl.style.top = `${rect.bottom + 2}px`
          dropdownEl.style.left = `${rect.left}px`

          for (const item of options.items) {
            if (item.type === 'separator') {
              const sep = document.createElement('div')
              sep.className = 'superchart-toolbar-dropdown-separator'
              dropdownEl.appendChild(sep)
            } else {
              const itemEl = document.createElement('div')
              itemEl.className = 'superchart-toolbar-dropdown-item'
              if (item.icon) {
                const iconSpan = document.createElement('span')
                iconSpan.innerHTML = item.icon
                iconSpan.style.marginRight = '8px'
                iconSpan.style.display = 'inline-flex'
                iconSpan.style.alignItems = 'center'
                itemEl.appendChild(iconSpan)
              }
              const label = document.createElement('span')
              label.textContent = item.text
              itemEl.appendChild(label)
              itemEl.addEventListener('click', () => { close(); item.onClick() })
              dropdownEl.appendChild(itemEl)
            }
          }

          document.body.appendChild(dropdownEl)
          document.addEventListener('mousedown', onOutside)
        })

        container?.appendChild(trigger)
        return trigger
      },
      // Event subscription methods are handled by the Superchart class directly,
      // not proxied through the internal API. These stubs satisfy the interface.
      onSymbolChange: () => () => {},
      onPeriodChange: () => () => {},
      onVisibleRangeChange: () => () => {},
      onCrosshairMoved: () => () => {},
      onSelect: () => () => {},
      dispose: () => {},
    }

    onApiReady(api)
  }, [onApiReady, pushOverlay, backendApi, timezone, symbol, period, locale])

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
      {periodBarVisible && symbol && period && (
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
        onScriptClick={scriptProvider ? () => setScriptEditorVisible(!scriptEditorVisible) : undefined}
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
        onToolbarReady={handleToolbarReady}
        />
      )}

      {/* Main content area */}
      <div
        className="superchart-content"
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          position: 'relative',
        }}
      >
        {/* Chart area */}
        <div
          className="superchart-chart-area"
          style={{
            display: 'flex',
            flex: scriptEditorVisible ? '1 1 auto' : '1',
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

          {/* Settings floating (for overlay editing) — reads selectedOverlay from store */}
          {selectedOverlay && (
            <SettingFloating locale={locale} />
          )}

          {/* Overlay context menu (right-click / double-click) */}
          {overlayPopupVisible && (
            <OverlayOptionsPopup />
          )}

          {/* Overlay settings modal (full property editor) */}
          {overlaySettingVisible && (
            <OverlaySettingModal />
          )}

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

      </div>

      {/* Read-only code viewer for server preset indicators */}
      {readOnlyEditorVisible && (
        <ScriptEditor
          locale={locale}
          initialCode={readOnlyEditorCode}
          readOnly
          onClose={() => setReadOnlyEditorVisible(false)}
          onCloneAndEdit={(code) => {
            pendingCloneCodeRef.current = code
            setReadOnlyEditorVisible(false)
            setReadOnlyEditorCode('')
            setScriptEditorVisible(true)
          }}
        />
      )}

      {/* Script editor modal (overlays from right) */}
      {scriptEditorVisible && scriptProvider && (
        <ScriptEditor
          locale={locale}
          initialCode={pendingCloneCodeRef.current || undefined}
          onClose={() => { setScriptEditorVisible(false); pendingCloneCodeRef.current = '' }}
          onAddToChart={async (code) => {
            try {
              const symbolInfo = store.symbol()
              const periodInfo = store.period()
              const chart = store.instanceApi()

              if (!symbolInfo || !periodInfo || !chart) {
                console.error('Chart not ready')
                return
              }

              // Execute the script as an indicator
              const subscription = await scriptProvider.executeAsIndicator({
                code,
                language: 'pine',
                symbol: symbolInfo,
                period: periodInfo,
              })

              // Create data store for this script
              const dataStore = new Map<number, any>()

              // Generate unique template name
              const templateName = `SCRIPT_${subscription.indicatorId}`

              // Register indicator with klinecharts (following useBackendIndicators pattern)
              const { registerIndicator } = await import('klinecharts')

              // Build figures from metadata plots
              log('[Script] metadata.plots:', JSON.stringify(subscription.metadata.plots, null, 2))
              const figures: any[] = []
              const hlineKeys: { key: string; id: string; price: number }[] = []
              const fillPlots: { plot1: string; plot2: string; color: string; transp?: number }[] = []
              const shapePlots: { id: string; style: string; location: string; color: string; size: string; text?: string; textcolor?: string; linewidth?: number }[] = []
              const gapConnectPlots: { id: string; color: string; linewidth: number }[] = []

              for (const plot of subscription.metadata.plots) {
                switch (plot.type) {
                  case 'plot': {
                    const p = plot as any
                    const plotColor = p.color || '#2196F3'
                    const plotLinewidth = p.linewidth || 1
                    if (p.gapConnect) {
                      // Sparse/conditional plot — register invisible figure, render via draw callback
                      gapConnectPlots.push({ id: p.id, color: plotColor, linewidth: plotLinewidth })
                      figures.push({
                        key: p.id,
                        title: `${p.title}: `,
                        type: 'line',
                        styles: () => ({ color: 'transparent', size: 0 }),
                      })
                    } else {
                      figures.push({
                        key: p.id,
                        title: `${p.title}: `,
                        type: p.style === 'circles' ? 'circle' : 'line',
                        styles: () => ({
                          color: plotColor,
                          size: plotLinewidth,
                        }),
                      })
                    }
                    break
                  }
                  case 'histogram': {
                    const h = plot as any
                    figures.push({
                      key: h.id,
                      title: `${h.title}: `,
                      type: 'bar',
                      baseValue: h.histBase ?? 0,
                    })
                    break
                  }
                  case 'hline': {
                    const hl = plot as any
                    const hlineKey = `hline_${hl.price}`
                    const hlColor = hl.color || '#888888'
                    const hlLinestyle = hl.linestyle || 'dashed'
                    hlineKeys.push({ key: hlineKey, id: hl.id || hlineKey, price: hl.price })
                    figures.push({
                      key: hlineKey,
                      title: `${hl.title || `Level ${hl.price}`}: `,
                      type: 'line',
                      styles: () => ({
                        color: hlColor,
                        style: hlLinestyle === 'solid' ? 'solid' : 'dashed',
                        dashedValue: hlLinestyle === 'dotted' ? [2, 2] : [6, 3],
                        size: hl.linewidth || 1,
                      }),
                    })
                    break
                  }
                  case 'plotshape':
                  case 'plotchar': {
                    const ps = plot as any
                    if (ps.id) {
                      shapePlots.push({
                        id: ps.id,
                        style: ps.style || 'xcross',
                        location: ps.location || 'abovebar',
                        color: ps.color || '#2196F3',
                        size: ps.size || 'small',
                        text: ps.text,
                        textcolor: ps.textcolor,
                        linewidth: ps.linewidth,
                      })
                      // Still register as a figure so calc produces data for it
                      figures.push({
                        key: ps.id,
                        title: '',
                        type: 'circle',
                        styles: () => ({ color: 'transparent' }), // Invisible; draw callback renders it
                      })
                    }
                    break
                  }
                  case 'fill': {
                    const f = plot as any
                    fillPlots.push({
                      plot1: f.plot1,
                      plot2: f.plot2,
                      color: f.color || 'rgba(33, 150, 243, 0.1)',
                      transp: f.transp,
                    })
                    break
                  }
                }
              }

              // Collect all figure keys for null fallback in calc
              const allFigureKeys = figures.map((f: any) => f.key)
              log('[Script] allFigureKeys:', allFigureKeys)
              log('[Script] gapConnectPlots:', gapConnectPlots)
              log('[Script] shapePlots:', shapePlots)

              // Build draw callback for custom rendering (fill, shapes, gap-connect lines)
              const hasFills = fillPlots.length > 0
              const hasShapes = shapePlots.length > 0
              const hasGapConnect = gapConnectPlots.length > 0
              let gcLogCount = 0
              const drawCallback = (hasFills || hasShapes || hasGapConnect) ? (params: any) => {
                const { ctx, chart, indicator, bounding, xAxis, yAxis } = params
                const { realFrom, realTo } = chart.getVisibleRange()
                const result = indicator.result

                // --- Draw fills ---
                for (const fill of fillPlots) {
                  const isHlineFill1 = hlineKeys.find(h => h.id === fill.plot1 || h.key === fill.plot1)
                  const isHlineFill2 = hlineKeys.find(h => h.id === fill.plot2 || h.key === fill.plot2)

                  // Apply transparency to fill color
                  let fillColor = fill.color
                  if (fill.transp !== undefined) {
                    const alpha = 1 - fill.transp / 100
                    // If color is already rgba, replace the alpha
                    if (fillColor.startsWith('rgba')) {
                      fillColor = fillColor.replace(/,\s*[\d.]+\)$/, `, ${alpha})`)
                    } else if (fillColor.startsWith('#')) {
                      const hex = fillColor.replace('#', '')
                      const r = parseInt(hex.substring(0, 2), 16)
                      const g = parseInt(hex.substring(2, 4), 16)
                      const b = parseInt(hex.substring(4, 6), 16)
                      fillColor = `rgba(${r}, ${g}, ${b}, ${alpha})`
                    }
                  }

                  if (isHlineFill1 && isHlineFill2) {
                    // Fill between two horizontal lines (full width)
                    const y1 = yAxis.convertToPixel(isHlineFill1.price)
                    const y2 = yAxis.convertToPixel(isHlineFill2.price)
                    ctx.fillStyle = fillColor
                    ctx.fillRect(0, Math.min(y1, y2), bounding.width, Math.abs(y2 - y1))
                  } else {
                    // Fill between two plot series
                    const points1: { x: number; y: number }[] = []
                    const points2: { x: number; y: number }[] = []

                    for (let i = realFrom; i < realTo; i++) {
                      const data = result[i]
                      if (!data) continue
                      const x = xAxis.convertToPixel(i)
                      const v1 = isHlineFill1 ? isHlineFill1.price : data[fill.plot1]
                      const v2 = isHlineFill2 ? isHlineFill2.price : data[fill.plot2]
                      if (v1 != null && !isNaN(v1)) points1.push({ x, y: yAxis.convertToPixel(v1) })
                      if (v2 != null && !isNaN(v2)) points2.push({ x, y: yAxis.convertToPixel(v2) })
                    }

                    if (points1.length > 1 && points2.length > 1) {
                      ctx.beginPath()
                      ctx.moveTo(points1[0].x, points1[0].y)
                      for (let i = 1; i < points1.length; i++) {
                        ctx.lineTo(points1[i].x, points1[i].y)
                      }
                      for (let i = points2.length - 1; i >= 0; i--) {
                        ctx.lineTo(points2[i].x, points2[i].y)
                      }
                      ctx.closePath()
                      ctx.fillStyle = fillColor
                      ctx.fill()
                    }
                  }
                }

                // --- Draw shapes ---
                for (const shape of shapePlots) {
                  let lastLinePoint: { x: number; y: number } | null = null
                  for (let i = realFrom; i < realTo; i++) {
                    const data = result[i]
                    if (!data) continue
                    const val = data[shape.id]
                    if (val == null || isNaN(val)) continue

                    const x = xAxis.convertToPixel(i)
                    let y: number

                    // Determine y position based on location
                    const klineData = chart.getDataList()[i]
                    switch (shape.location) {
                      case 'absolute':
                        y = yAxis.convertToPixel(val)
                        break
                      case 'abovebar':
                        y = klineData ? yAxis.convertToPixel(klineData.high) - 10 : 0
                        break
                      case 'belowbar':
                        y = klineData ? yAxis.convertToPixel(klineData.low) + 10 : bounding.height
                        break
                      case 'top':
                        y = 15
                        break
                      case 'bottom':
                        y = bounding.height - 15
                        break
                      default:
                        y = yAxis.convertToPixel(val)
                    }

                    const sizeMap: Record<string, number> = { tiny: 6, small: 8, normal: 12, large: 16, huge: 20 }
                    const sz = sizeMap[shape.size] || 8

                    ctx.fillStyle = shape.color

                    // Draw shape based on style
                    switch (shape.style) {
                      case 'line': {
                        // Draw line segment from previous non-NaN point to current
                        if (lastLinePoint) {
                          ctx.beginPath()
                          ctx.moveTo(lastLinePoint.x, lastLinePoint.y)
                          ctx.lineTo(x, y)
                          ctx.strokeStyle = shape.color
                          ctx.lineWidth = shape.linewidth || 2
                          ctx.stroke()
                        }
                        lastLinePoint = { x, y }
                        break
                      }
                      case 'labelup': {
                        // Label with upward-pointing tip: tip at top, body below
                        const fontSize = Math.max(Math.round(sz * 1.5), 10)
                        ctx.font = `bold ${fontSize}px sans-serif`
                        const lw = shape.text ? ctx.measureText(shape.text).width + 12 : sz * 2.5
                        const lh = fontSize * 1.6
                        const tipH = 6
                        ctx.beginPath()
                        ctx.moveTo(x, y - lh - tipH)               // tip top (pointing UP)
                        ctx.lineTo(x + 5, y - lh)                  // right of tip meets body top
                        ctx.lineTo(x + lw / 2, y - lh)             // body top-right
                        ctx.lineTo(x + lw / 2, y)                  // body bottom-right
                        ctx.lineTo(x - lw / 2, y)                  // body bottom-left
                        ctx.lineTo(x - lw / 2, y - lh)             // body top-left
                        ctx.lineTo(x - 5, y - lh)                  // left of tip meets body top
                        ctx.closePath()
                        ctx.fill()
                        if (shape.text) {
                          ctx.fillStyle = shape.textcolor || '#FFFFFF'
                          ctx.textAlign = 'center'
                          ctx.textBaseline = 'middle'
                          ctx.fillText(shape.text, x, y - lh / 2)
                        }
                        break
                      }
                      case 'labeldown': {
                        // Label with downward-pointing tip: body above, tip at bottom
                        const fontSize = Math.max(Math.round(sz * 1.5), 10)
                        ctx.font = `bold ${fontSize}px sans-serif`
                        const lw = shape.text ? ctx.measureText(shape.text).width + 12 : sz * 2.5
                        const lh = fontSize * 1.6
                        const tipH = 6
                        ctx.beginPath()
                        ctx.moveTo(x - lw / 2, y)                  // body top-left
                        ctx.lineTo(x + lw / 2, y)                  // body top-right
                        ctx.lineTo(x + lw / 2, y + lh)             // body bottom-right
                        ctx.lineTo(x + 5, y + lh)                  // right of tip meets body bottom
                        ctx.lineTo(x, y + lh + tipH)               // tip bottom (pointing DOWN)
                        ctx.lineTo(x - 5, y + lh)                  // left of tip meets body bottom
                        ctx.lineTo(x - lw / 2, y + lh)             // body bottom-left
                        ctx.closePath()
                        ctx.fill()
                        if (shape.text) {
                          ctx.fillStyle = shape.textcolor || '#FFFFFF'
                          ctx.textAlign = 'center'
                          ctx.textBaseline = 'middle'
                          ctx.fillText(shape.text, x, y + lh / 2)
                        }
                        break
                      }
                      case 'triangleup': {
                        ctx.beginPath()
                        ctx.moveTo(x, y - sz * 0.7)
                        ctx.lineTo(x + sz * 0.5, y + sz * 0.3)
                        ctx.lineTo(x - sz * 0.5, y + sz * 0.3)
                        ctx.closePath()
                        ctx.fill()
                        break
                      }
                      case 'arrowup': {
                        const asz = sz / 3
                        ctx.beginPath()
                        ctx.moveTo(x, y - asz * 0.7)
                        ctx.lineTo(x + asz * 0.5, y + asz * 0.3)
                        ctx.lineTo(x - asz * 0.5, y + asz * 0.3)
                        ctx.closePath()
                        ctx.fill()
                        break
                      }
                      case 'triangledown': {
                        ctx.beginPath()
                        ctx.moveTo(x, y + sz * 0.7)
                        ctx.lineTo(x - sz * 0.5, y - sz * 0.3)
                        ctx.lineTo(x + sz * 0.5, y - sz * 0.3)
                        ctx.closePath()
                        ctx.fill()
                        break
                      }
                      case 'arrowdown': {
                        const asz = sz / 3
                        ctx.beginPath()
                        ctx.moveTo(x, y + asz * 0.7)
                        ctx.lineTo(x - asz * 0.5, y - asz * 0.3)
                        ctx.lineTo(x + asz * 0.5, y - asz * 0.3)
                        ctx.closePath()
                        ctx.fill()
                        break
                      }
                      case 'diamond': {
                        ctx.beginPath()
                        ctx.moveTo(x, y - sz)
                        ctx.lineTo(x + sz * 0.7, y)
                        ctx.lineTo(x, y + sz)
                        ctx.lineTo(x - sz * 0.7, y)
                        ctx.closePath()
                        ctx.fill()
                        break
                      }
                      case 'cross': {
                        ctx.lineWidth = 2
                        ctx.strokeStyle = shape.color
                        ctx.beginPath()
                        ctx.moveTo(x - sz / 2, y)
                        ctx.lineTo(x + sz / 2, y)
                        ctx.moveTo(x, y - sz / 2)
                        ctx.lineTo(x, y + sz / 2)
                        ctx.stroke()
                        break
                      }
                      case 'xcross': {
                        ctx.lineWidth = 2
                        ctx.strokeStyle = shape.color
                        ctx.beginPath()
                        ctx.moveTo(x - sz / 2, y - sz / 2)
                        ctx.lineTo(x + sz / 2, y + sz / 2)
                        ctx.moveTo(x + sz / 2, y - sz / 2)
                        ctx.lineTo(x - sz / 2, y + sz / 2)
                        ctx.stroke()
                        break
                      }
                      case 'circle':
                      default: {
                        ctx.beginPath()
                        ctx.arc(x, y, sz / 2, 0, Math.PI * 2)
                        ctx.fill()
                        break
                      }
                    }
                  }
                }

                // --- Draw gap-connect lines (sparse/conditional plots like divergence) ---
                if (gapConnectPlots.length > 0 && gcLogCount < 5) {
                  gcLogCount++
                  const dataListDbg = chart.getDataList()
                  for (const gc of gapConnectPlots) {
                    let nonNullCount = 0
                    let colorCount = 0
                    let transparentCount = 0
                    let drawnCount = 0
                    let hasLastPt = false
                    for (let i = realFrom; i < realTo; i++) {
                      const d = result[i]
                      if (d && d[gc.id] != null && !isNaN(d[gc.id])) {
                        nonNullCount++
                        const kl = dataListDbg[i]
                        const sp = kl ? dataStore.get(kl.timestamp) : null
                        const bc = sp?.colors?.[gc.id]
                        if (bc) colorCount++
                        const finalColor = bc || gc.color
                        const isT = finalColor.endsWith('00') || finalColor.includes(', 0)') || finalColor.includes(',0)')
                        if (isT) transparentCount++
                        if (hasLastPt && !isT) drawnCount++
                        hasLastPt = true
                      }
                    }
                    log(`[Script draw] gc "${gc.id}": ${nonNullCount} non-null, ${colorCount} with per-bar color, ${transparentCount} transparent, ${drawnCount} segments to draw, gc.color="${gc.color}"`)
                  }
                }
                const dataList = chart.getDataList()
                for (const gc of gapConnectPlots) {
                  let lastPoint: { x: number; y: number } | null = null
                  for (let i = realFrom; i < realTo; i++) {
                    const data = result[i]
                    if (!data) continue // Keep lastPoint — connect across gaps
                    const val = data[gc.id]
                    if (val == null || (typeof val === 'number' && isNaN(val))) continue // Keep lastPoint

                    // Get per-bar color from dataStore (if available)
                    const kline = dataList[i]
                    const storePoint = kline ? dataStore.get(kline.timestamp) : null
                    const barColor = storePoint?.colors?.[gc.id] || gc.color

                    // Check if current bar's color is transparent
                    const isTransparent = barColor.endsWith('00') || barColor.includes(', 0)') || barColor.includes(',0)')

                    const x = xAxis.convertToPixel(i)
                    const y = yAxis.convertToPixel(val)
                    // Draw segment only when CURRENT bar's color is non-transparent
                    // (matching TradingView: destination bar's color controls segment visibility)
                    if (lastPoint && !isTransparent) {
                      ctx.beginPath()
                      ctx.moveTo(lastPoint.x, lastPoint.y)
                      ctx.lineTo(x, y)
                      // Make color fully opaque for drawing (transparency only controls visibility)
                      let opaqueColor = barColor
                      if (barColor.startsWith('#') && barColor.length === 9) {
                        // #RRGGBBAA → #RRGGBB (strip alpha, draw at full opacity)
                        opaqueColor = barColor.substring(0, 7)
                      } else if (barColor.startsWith('rgba(')) {
                        // rgba(r, g, b, a) → rgba(r, g, b, 1)
                        opaqueColor = barColor.replace(/,\s*[\d.]+\)$/, ', 1)')
                      }
                      ctx.strokeStyle = opaqueColor
                      ctx.lineWidth = gc.linewidth
                      ctx.stroke()
                    }
                    // Always track lastPoint through ALL non-null values
                    // (don't reset on transparent — next visible bar needs to connect back)
                    lastPoint = { x, y }
                  }
                }

                return false // Continue with default figure rendering (plots, hlines)
              } : null

              registerIndicator({
                name: templateName,
                shortName: subscription.metadata.shortName,
                precision: subscription.metadata.precision,
                figures,
                draw: drawCallback,
                calc: (dataList: any[]) => {
                  let calcGcCount = 0
                  const mapped = dataList.map((kline: any) => {
                    const point = dataStore.get(kline.timestamp)
                    const result: Record<string, number | null> = {}

                    // Initialize all keys to null
                    for (const key of allFigureKeys) {
                      result[key] = null
                    }

                    // Fill in plot values from data store
                    if (point?.values) {
                      for (const [key, value] of Object.entries(point.values)) {
                        result[key] = value as number
                      }
                      // Count gapConnect data points
                      for (const gc of gapConnectPlots) {
                        if (point.values[gc.id] !== undefined) calcGcCount++
                      }
                    }

                    // Fill in constant hline values (always present)
                    for (const hl of hlineKeys) {
                      result[hl.key] = hl.price
                    }

                    return result
                  })
                  if (calcGcCount > 0) {
                    log(`[Script calc] gapConnect data points in calc: ${calcGcCount}, dataStore size: ${dataStore.size}`)
                  }
                  return mapped
                },
              })

              // Create indicator on chart
              const isOverlay = subscription.metadata.paneId === 'candle_pane'
              chart.createIndicator(
                { name: templateName },
                isOverlay,
                isOverlay ? { id: 'candle_pane' } : undefined
              )

              // Wire up data handlers
              subscription.onData((points: any[]) => {
                dataStore.clear()
                if (Array.isArray(points)) {
                  // Log first few data points and all unique value keys to debug data flow
                  const allKeys = new Set<string>()
                  let nonNullSamples: any[] = []
                  for (const point of points) {
                    dataStore.set(point.timestamp, point)
                    if (point.values) {
                      for (const k of Object.keys(point.values)) allKeys.add(k)
                      // Collect samples where gapConnect keys have data
                      if (nonNullSamples.length < 5) {
                        for (const gc of gapConnectPlots) {
                          if (point.values[gc.id] !== undefined) {
                            nonNullSamples.push({ ts: point.timestamp, key: gc.id, val: point.values[gc.id] })
                          }
                        }
                      }
                    }
                  }
                  // Check for per-bar colors
                  let colorSampleCount = 0
                  let colorSamples: any[] = []
                  for (const point of points) {
                    if (point.colors && colorSampleCount < 3) {
                      colorSamples.push({ ts: point.timestamp, colors: point.colors })
                      colorSampleCount++
                    }
                  }
                  log('[Script] onData: total points:', points.length, 'all value keys:', [...allKeys])
                  log('[Script] onData: gapConnect samples:', nonNullSamples)
                  log('[Script] onData: color samples:', colorSamples)
                }
                chart.overrideIndicator({ name: templateName })
              })

              subscription.onTick((point: any) => {
                dataStore.set(point.timestamp, point)
                chart.overrideIndicator({ name: templateName })
              })

              subscription.onHistory?.((points: any[]) => {
                // Merge historical backfill data — do NOT clear existing store
                if (Array.isArray(points)) {
                  for (const point of points) {
                    dataStore.set(point.timestamp, point)
                  }
                }
                chart.overrideIndicator({ name: templateName })
              })

              subscription.onError?.((error: Error) => {
                console.error('Script execution error:', error)
              })

              setScriptEditorVisible(false)
            } catch (error) {
              console.error('Script execution failed:', error)
            }
          }}
          onSave={async (code, name) => {
            // Save script logic here
            log('Saving script:', name, code)
          }}
        />
      )}

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
