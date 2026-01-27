/**
 * Chart State Store - Chart state persistence and management
 *
 * Handles saving and restoring chart state including indicators,
 * overlays, and styles.
 */

import type {
  Chart,
  DeepPartial,
  Indicator,
  IndicatorCreate,
  IndicatorTooltipData,
  Nullable,
  Overlay,
  OverlayCreate,
  OverlayEvent,
  PaneOptions,
  TooltipFeatureStyle,
} from 'klinecharts'
import cloneDeep from 'lodash/cloneDeep'

import type { OverlayProperties, ProOverlay } from '../types/overlay'
import type { PaneProperties } from './chartStore'
import {
  instanceApi,
  mainIndicators,
  setMainIndicators,
  subIndicators,
  setSubIndicators,
  setSelectedOverlay,
  setStyles,
  setChartModified,
  storageAdapter,
  storageKey,
} from './chartStore'
import { ctrlKeyedDown } from './keyEventStore'
import { useOverlaySettings } from './overlaySettingStore'
import type { OverlayType } from './overlaySettingStore'

// Chart state object type for storage
export interface ChartObjType {
  styleObj?: DeepPartial<PaneProperties>
  overlays?: Array<{
    value?: OverlayCreate & { properties?: DeepPartial<OverlayProperties> }
    paneId?: string
  }>
  indicators?: Array<{
    value?: IndicatorCreate
    isStack?: boolean
    paneOptions?: PaneOptions
  }>
  figures?: unknown[]
}

// Indicator settings type
export interface IndicatorSettingsType {
  visible: boolean
  indicatorName: string
  paneId: string
  calcParams: unknown[]
}

// CSS root variable names
type CssRootVar =
  | '--klinecharts-pro-primary-color'
  | '--klinecharts-pro-hover-background-color'
  | '--klinecharts-pro-background-color'
  | '--klinecharts-pro-popover-background-color'
  | '--klinecharts-pro-text-color'
  | '--klinecharts-pro-text-second-color'
  | '--klinecharts-pro-border-color'
  | '--klinecharts-pro-selected-color'
  | '--klinecharts-pro-popup-shadow-color'
  | '--klinecharts-pro-pane-background'
  | '--klinecharts-pro-pane-background-gradient-start'
  | '--klinecharts-pro-pane-background-gradient-end'

/**
 * Resize document/chart
 */
export const documentResize = (): void => {
  instanceApi()?.resize()
}

/**
 * Cleanup when leaving chart
 */
export const cleanup = async (): Promise<void> => {
  // Cleanup operations when leaving chart page
}

/**
 * Remove event listeners and functions from indicator object
 */
const refineIndiObj = (indicator: Indicator): IndicatorCreate => {
  const keys = ['calc', 'figures', 'regenerateFigures', 'draw', 'createTooltipDataSource']
  const cleanIndicator: IndicatorCreate = indicator as IndicatorCreate

  keys.forEach((key) => {
    delete (cleanIndicator as Record<string, unknown>)[key]
  })

  return cleanIndicator
}

/**
 * Remove event listeners from overlay object
 */
const refineOverlayObj = (overlay: Overlay): OverlayCreate => {
  const keys = [
    'onDrawStart',
    'onDrawing',
    'onDrawEnd',
    'onClick',
    'onDoubleClick',
    'onRightClick',
    'onMouseEnter',
    'onMouseLeave',
    'onPressedMoveStart',
    'onPressedMoving',
    'onPressedMoveEnd',
    'onRemoved',
    'onSelected',
    'onDeselected',
    'performEventMoveForDrawing',
    'performEventPressedMove',
    '_prevPressedPoint',
    '_prevPressedPoints',
    'createPointFigures',
    'createXAxisFigures',
    'createYAxisFigures',
  ]

  const cleanOverlay: OverlayCreate = overlay as OverlayCreate

  keys.forEach((key) => {
    delete (cleanOverlay as Record<string, unknown>)[key]
  })

  return cleanOverlay
}

/**
 * Get chart state from storage
 */
const getChartState = async (): Promise<ChartObjType | null> => {
  const adapter = storageAdapter()
  const key = storageKey()

  if (adapter && key) {
    const state = await adapter.load(key)
    if (state) {
      // Convert ChartState to ChartObjType
      return {
        styleObj: state.styles as ChartObjType['styleObj'],
        overlays: state.overlays?.map(o => ({
          value: {
            id: o.id,
            name: o.name,
            points: o.points.map(p => ({ timestamp: p.timestamp, value: p.value })),
            properties: o.properties
          },
          paneId: o.paneId
        })),
        indicators: state.indicators?.map(i => ({
          value: { id: i.id, name: i.name, calcParams: i.calcParams },
          isStack: i.isStack,
          paneOptions: i.paneOptions
        }))
      }
    }
    return null
  }

  // Fallback to localStorage
  const localData = localStorage.getItem('chartstatedata')
  return localData ? (JSON.parse(localData) as ChartObjType) : null
}

/**
 * Save chart state to storage
 */
const saveChartState = async (chartObj: ChartObjType): Promise<void> => {
  const adapter = storageAdapter()
  const key = storageKey()

  if (adapter && key) {
    // Convert ChartObjType to ChartState
    const overlays = chartObj.overlays?.map(o => {
      const overlayValue = o.value as unknown as { points?: Array<{ timestamp?: number; value?: number }> }
      return {
        id: o.value?.id ?? '',
        name: o.value?.name ?? '',
        paneId: o.paneId ?? '',
        points: (overlayValue?.points ?? []).map(p => ({
          timestamp: p.timestamp ?? 0,
          value: p.value ?? 0
        })),
        lock: false,
        visible: true,
        properties: o.value?.properties
      }
    }) ?? []

    const indicators = chartObj.indicators?.map(i => ({
      id: i.value?.id ?? '',
      name: i.value?.name ?? '',
      paneId: i.paneOptions?.id ?? '',
      calcParams: i.value?.calcParams,
      visible: true,
      isStack: i.isStack,
      paneOptions: i.paneOptions
    })) ?? []

    const state = {
      version: 1,
      styles: chartObj.styleObj ?? {},
      overlays,
      indicators,
      paneLayout: [],
      preferences: {
        showVolume: true,
        showCrosshair: true,
        showGrid: true,
        showLegend: true,
        magnetMode: 'normal' as const
      },
      savedAt: Date.now()
    }
    await adapter.save(key, state)
  }

  // Also save to localStorage as fallback
  localStorage.setItem('chartstatedata', JSON.stringify(chartObj))
  setChartModified(true)
}

/**
 * Hook-like function for chart state management
 */
export const useChartState = () => {
  /**
   * Sync indicator object to storage
   */
  const syncIndiObject = async (
    indicator: Indicator,
    isStack?: boolean,
    paneOptions?: PaneOptions
  ): Promise<boolean> => {
    const chartObj = (await getChartState()) ?? {}
    const indi = refineIndiObj(cloneDeep(indicator))

    if (!chartObj.indicators) {
      chartObj.indicators = [{ value: indi, isStack, paneOptions }]
    } else {
      const existingIndex = chartObj.indicators.findIndex(
        (_indi) => _indi.value?.name === indi.name && _indi.paneOptions?.id === paneOptions?.id
      )

      if (existingIndex >= 0) {
        chartObj.indicators[existingIndex] = { value: indi, isStack, paneOptions }
      } else {
        chartObj.indicators.push({ value: indi, isStack, paneOptions })
      }
    }

    await saveChartState(chartObj)
    return false
  }

  /**
   * Sync overlay object to storage
   */
  const syncObject = async (overlay: ProOverlay): Promise<boolean> => {
    const chartObj = (await getChartState()) ?? {}
    const overly = refineOverlayObj(cloneDeep(overlay))

    if (!chartObj.overlays) {
      chartObj.overlays = [{ value: overlay, paneId: overlay.paneId }]
    } else {
      const existingIndex = chartObj.overlays.findIndex(
        (ovaly) => ovaly.value?.id === overly.id
      )

      if (existingIndex >= 0) {
        chartObj.overlays[existingIndex] = { value: overly, paneId: overlay.paneId }
      } else {
        chartObj.overlays.push({ value: overly, paneId: overlay.paneId })
      }
    }

    await saveChartState(chartObj)
    return false
  }

  /**
   * Create an indicator on the chart
   */
  function createIndicator(
    widget: Chart,
    indicatorName: string,
    isStack?: boolean,
    paneOptions?: PaneOptions,
    doCallback = false
  ): Nullable<string> {
    if (indicatorName === 'VOL') {
      paneOptions = { axis: { gap: { bottom: 2 } }, ...paneOptions }
    }

    const id = widget.createIndicator(
      {
        name: indicatorName,
        createTooltipDataSource: (param): IndicatorTooltipData => {
          const indiStyles = param.chart.getStyles().indicator
          const features = indiStyles.tooltip.features
          const icons: TooltipFeatureStyle[] = []

          icons.push(param.indicator.visible ? features[1] : features[0])
          icons.push(features[2])
          icons.push(features[3])

          return {
            name: `${indicatorName}_${id}`,
            calcParamsText: indicatorName,
            features: icons,
            legends: [],
          }
        },
      },
      isStack,
      paneOptions
    ) ?? null

    if (id && doCallback) {
      const indi = widget.getIndicators({ id, name: indicatorName })[0]
      if (indi) {
        syncIndiObject(indi as Indicator, isStack, { id })
      }
    }

    return id
  }

  /**
   * Push an overlay to the chart
   */
  const pushOverlay = (
    overlay: OverlayCreate & { properties?: DeepPartial<OverlayProperties> },
    paneId?: string,
    redrawing = false
  ): void => {
    const chart = instanceApi()
    if (!chart) return

    const id = chart.createOverlay({ ...overlay, paneId }) as Nullable<string>
    if (!id) return

    const ovrly = chart.getOverlays({ id })[0]

    const handleRightClick = (event: OverlayEvent<unknown>): boolean => {
      if (event.preventDefault) {
        event.preventDefault()
      }

      if (ctrlKeyedDown()) {
        popOverlay(event.overlay.id)
        return true
      }

      useOverlaySettings().openPopup(event, { overlayType: event.overlay.name as OverlayType })
      return true
    }

    if (ovrly) {
      if (overlay.properties) {
        (ovrly as ProOverlay).setProperties?.(overlay.properties, id)
      }

      chart.overrideOverlay({
        id: ovrly.id,
        onDrawEnd: (event) => {
          if (!['measure'].includes(ovrly.name)) {
            syncObject(event.overlay as ProOverlay)
          }
          return false
        },
        onPressedMoveEnd: (event) => {
          if (!['measure'].includes(ovrly.name)) {
            syncObject(event.overlay as ProOverlay)
          }
          return false
        },
        onSelected: (event) => setSelectedOverlay(event.overlay as ProOverlay),
        onDeselected: () => setSelectedOverlay(null),
        onRightClick: ovrly.onRightClick ?? handleRightClick,
        onDoubleClick: ovrly.onDoubleClick ?? handleRightClick,
      })

      if (!redrawing) {
        syncObject(ovrly as ProOverlay)
      }
    }
  }

  /**
   * Remove an overlay from the chart
   */
  const popOverlay = async (id: string): Promise<void> => {
    const chartObj = await getChartState()
    if (chartObj) {
      chartObj.overlays = chartObj.overlays?.filter((overlay) => overlay.value?.id !== id)
      await saveChartState(chartObj)
    }
    instanceApi()?.removeOverlay({ id })
  }

  /**
   * Modify an overlay
   */
  const modifyOverlay = async (
    id: string,
    modifyInfo: Partial<OverlayCreate<unknown>>
  ): Promise<void> => {
    const chartObj = await getChartState()
    if (chartObj) {
      chartObj.overlays = chartObj.overlays?.map((overlay) => {
        if (overlay.value?.id === id) {
          overlay.value = { ...overlay.value, ...modifyInfo }
          overlay.paneId = modifyInfo.paneId ?? overlay.paneId
        }
        return overlay
      })
      await saveChartState(chartObj)
      instanceApi()?.overrideOverlay({ ...modifyInfo, id })
    }
  }

  /**
   * Modify overlay properties
   */
  const modifyOverlayProperties = async (
    id: string,
    properties: DeepPartial<OverlayProperties>
  ): Promise<void> => {
    const chartObj = await getChartState()
    if (chartObj) {
      chartObj.overlays = chartObj.overlays?.map((overlay) => {
        if (overlay.value?.id === id) {
          overlay.value!.properties = { ...overlay.value!.properties, ...properties }
        }
        return overlay
      })

      const overlays = instanceApi()?.getOverlays({ id })
      if (overlays && overlays.length > 0) {
        (overlays[0] as ProOverlay).setProperties?.(properties, id)
      }

      await saveChartState(chartObj)
    }
  }

  /**
   * Push/remove a main indicator
   */
  const pushMainIndicator = (data: { name: string; paneId: string; added: boolean }): void => {
    const chart = instanceApi()
    if (!chart) return

    const newMainIndicators = [...mainIndicators()]

    if (data.added) {
      createIndicator(chart, data.name, true, { id: 'candle_pane' }, true)
      newMainIndicators.push(data.name)
    } else {
      popIndicator(data.name, 'candle_pane')
      const index = newMainIndicators.indexOf(data.name)
      if (index >= 0) {
        newMainIndicators.splice(index, 1)
      }
    }

    setMainIndicators(newMainIndicators)
  }

  /**
   * Push/remove a sub indicator
   */
  const pushSubIndicator = (data: { name: string; paneId: string; added: boolean }): void => {
    const chart = instanceApi()
    if (!chart) return

    const newSubIndicators = { ...subIndicators() }

    if (data.added) {
      const paneId = createIndicator(chart, data.name, false, undefined, true)
      if (paneId) {
        newSubIndicators[data.name] = paneId
      }
    } else {
      if (data.paneId) {
        popIndicator(data.name, data.paneId)
        delete newSubIndicators[data.name]
      }
    }

    setSubIndicators(newSubIndicators)
  }

  /**
   * Modify indicator parameters
   */
  const modifyIndicator = async (
    modalParams: IndicatorSettingsType,
    params: unknown[]
  ): Promise<void> => {
    const chartObj = await getChartState()
    if (chartObj) {
      chartObj.indicators = chartObj.indicators?.map((indi) => {
        if (indi.value?.name === modalParams.indicatorName) {
          indi.value.name = modalParams.indicatorName
          indi.value.calcParams = params
          indi.paneOptions = { ...indi.paneOptions, id: modalParams.paneId }
        }
        return indi
      })

      await saveChartState(chartObj)
      instanceApi()?.overrideIndicator({
        name: modalParams.indicatorName,
        calcParams: params,
        paneId: modalParams.paneId,
      })
    }
  }

  /**
   * Remove an indicator
   */
  const popIndicator = async (id: string, paneId?: string, name?: string): Promise<void> => {
    instanceApi()?.removeIndicator({ id, paneId, name })

    const chartObj = await getChartState()
    if (chartObj) {
      chartObj.indicators = chartObj.indicators?.filter(
        (indi) => indi.paneOptions?.id !== paneId && indi.value?.name !== name
      )
      await saveChartState(chartObj)
    }
  }

  /**
   * Set CSS root variable
   */
  const setCssRootVar = (name: CssRootVar, value: string): void => {
    document.documentElement.style.setProperty(name, value, 'important')
    const root = document.querySelector('[data-theme]')
    if (root) {
      ;(root as HTMLElement).style.setProperty(name, value, 'important')
    }
  }

  /**
   * Apply style overrides to CSS variables
   */
  const applyStyleOverrides = (overrides: DeepPartial<PaneProperties>): void => {
    if (overrides.background) {
      setCssRootVar('--klinecharts-pro-pane-background', overrides.background as string)
    }

    if (overrides.backgroundGradientStartColor) {
      setCssRootVar(
        '--klinecharts-pro-pane-background-gradient-start',
        overrides.backgroundGradientStartColor as string
      )
    }

    if (overrides.backgroundGradientEndColor) {
      setCssRootVar(
        '--klinecharts-pro-pane-background-gradient-end',
        overrides.backgroundGradientEndColor as string
      )
    }

    if (overrides.separator?.color) {
      setCssRootVar('--klinecharts-pro-border-color', overrides.separator.color as string)
    }
  }

  /**
   * Restore chart state from storage
   */
  const restoreChartState = async (overrides?: DeepPartial<PaneProperties>): Promise<void> => {
    const chartObj = await getChartState()

    const redraw = (state: ChartObjType): void => {
      if (state.overlays) {
        state.overlays.forEach((overlay) => {
          if (overlay.value) {
            pushOverlay(overlay.value, overlay.paneId, true)
          }
        })
      }

      if (state.indicators) {
        setTimeout(() => {
          const chart = instanceApi()
          if (!chart) return

          const newMainIndicators = [...mainIndicators()]
          const newSubIndicators = { ...subIndicators() }

          state.indicators!.forEach((indicator) => {
            if (indicator.value) {
              chart.createIndicator(indicator.value, indicator.isStack, indicator.paneOptions)

              if (indicator.paneOptions?.id === 'candle_pane') {
                newMainIndicators.push(indicator.value.name)
              } else if (indicator.paneOptions?.id) {
                newSubIndicators[indicator.value.name] = indicator.paneOptions.id
              }
            }
          })

          setMainIndicators(newMainIndicators)
          setSubIndicators(newSubIndicators)
        }, 500)
      }
    }

    if (chartObj) {
      redraw(chartObj)
    }

    const stateObj = chartObj ?? {}

    if (overrides) {
      applyStyleOverrides(overrides)

      if (!stateObj.styleObj) {
        stateObj.styleObj = overrides
        await saveChartState(stateObj)
      }
    }

    if (stateObj.styleObj) {
      setStyles(stateObj.styleObj)
    }
  }

  return {
    createIndicator,
    modifyIndicator,
    popIndicator,
    syncIndiObject,
    syncObject,
    pushOverlay,
    modifyOverlay,
    modifyOverlayProperties,
    popOverlay,
    pushMainIndicator,
    pushSubIndicator,
    restoreChartState,
  }
}
