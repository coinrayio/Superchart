/**
 * Chart State Hook - Persistence and state management for indicators/overlays
 *
 * Follows the pattern from coinray-chart-ui/src/store/chartStateStore.ts
 * but uses the StorageAdapter interface for pluggable persistence.
 */

import { useCallback, useRef } from 'react'
import type {
  Indicator,
  Nullable,
  Overlay,
  OverlayCreate,
  OverlayEvent,
  PaneOptions,
  DeepPartial,
  IndicatorTooltipData,
  TooltipFeatureStyle,
} from 'klinecharts'
import * as store from '../store/chartStore'
import type { ChartState, SavedIndicator } from '../types/storage'
import type { SavedOverlay, OverlayProperties, ProOverlay } from '../types/overlay'
import { isOverlayVisibleForPeriod } from '../types/overlay'
import { createEmptyChartState } from '../types/storage'
import { ctrlKeyedDown } from '../store/keyEventStore'
import { useOverlaySettings, setPopupOverlay, setShowOverlaySetting, getOverlayTimeframeVisibility, setOverlayTimeframeVisibility, getAllOverlayTimeframeVisibility } from '../store/overlaySettingStore'
import type { OverlayType } from '../store/overlaySettingStore'
import { getDefaultForOverlay, setDefaultForOverlay, setOverlayDefaults } from '../store/overlayDefaultStyles'
import { overlayPropertiesToKlineStyles } from '../widget/overlay/overlayPropertySchemas'

/**
 * Convert Overlay to SavedOverlay format
 */
function overlayToSaved(overlay: Overlay, properties?: DeepPartial<OverlayProperties>, figureStyles?: Record<string, Record<string, unknown>>): SavedOverlay {
  const saved: SavedOverlay = {
    id: overlay.id,
    name: overlay.name,
    paneId: overlay.paneId,
    groupId: overlay.groupId,
    points: overlay.points.map(p => ({
      timestamp: p.timestamp ?? 0,
      value: p.value ?? 0,
    })),
    properties,
    figureStyles,
    lock: overlay.lock,
    visible: overlay.visible,
    mode: overlay.mode,
    extendData: overlay.extendData,
  }
  // Persist timeframe visibility if configured
  const tfVisibility = getOverlayTimeframeVisibility(overlay.id)
  if (tfVisibility && !tfVisibility.showOnAll) {
    saved.timeframeVisibility = tfVisibility
  }
  return saved
}

/**
 * Convert Indicator to SavedIndicator format
 */
function indicatorToSaved(
  indicator: Indicator,
  isStack?: boolean,
  paneOptions?: PaneOptions
): SavedIndicator {
  return {
    id: indicator.id,
    name: indicator.name,
    paneId: indicator.paneId,
    calcParams: indicator.calcParams as unknown[],
    visible: indicator.visible,
    isStack,
    paneOptions,
    styles: indicator.styles as Record<string, unknown> | undefined,
  }
}

export interface UseChartStateOptions {
  /** Called when overlay is right-clicked */
  onOverlayRightClick?: (event: OverlayEvent<unknown>) => void
  /** Called when overlay is double-clicked */
  onOverlayDoubleClick?: (event: OverlayEvent<unknown>) => void
}

/**
 * Hook for managing chart state persistence
 */
export function useChartState(options: UseChartStateOptions = {}) {
  // Cache for current state to avoid excessive storage reads
  const stateCache = useRef<ChartState | null>(null)

  /**
   * Load state from storage
   */
  const loadState = useCallback(async (): Promise<ChartState> => {
    const adapter = store.storageAdapter()
    const key = store.storageKey()

    if (!adapter) {
      return stateCache.current ?? createEmptyChartState()
    }

    const state = await adapter.load(key)
    stateCache.current = state ?? createEmptyChartState()
    return stateCache.current
  }, [])

  /**
   * Save state to storage
   */
  const saveState = useCallback(
    async (state: ChartState): Promise<void> => {
      stateCache.current = state
      store.setChartModified(true)

      const adapter = store.storageAdapter()
      const key = store.storageKey()

      if (adapter) {
        state.savedAt = Date.now()
        await adapter.save(key, state)
      }
    },
    []
  )

  /**
   * Sync indicator to storage
   */
  const syncIndicator = useCallback(
    async (indicator: Indicator, isStack?: boolean, paneOptions?: PaneOptions): Promise<void> => {
      const state = await loadState()
      const saved = indicatorToSaved(indicator, isStack, paneOptions)

      const existingIndex = state.indicators.findIndex(
        (ind) => ind.name === indicator.name && ind.paneId === (paneOptions?.id ?? indicator.paneId)
      )

      if (existingIndex >= 0) {
        state.indicators[existingIndex] = saved
      } else {
        state.indicators.push(saved)
      }

      await saveState(state)
    },
    [loadState, saveState]
  )

  /**
   * Sync overlay to storage
   */
  const syncOverlay = useCallback(
    async (overlay: Overlay, properties?: DeepPartial<OverlayProperties>): Promise<void> => {
      const state = await loadState()
      const saved = overlayToSaved(overlay, properties)

      const existingIndex = state.overlays.findIndex((o) => o.id === overlay.id)

      if (existingIndex >= 0) {
        state.overlays[existingIndex] = saved
      } else {
        state.overlays.push(saved)
      }

      await saveState(state)
    },
    [loadState, saveState]
  )

  /**
   * Create indicator with tooltip configuration
   */
  const createIndicator = useCallback(
    (
      indicatorName: string,
      isStack?: boolean,
      paneOptions?: PaneOptions,
      shouldSync = false
    ): Nullable<string> => {
      const chartInstance = store.instanceApi()
      if (!chartInstance) return null

      // Special handling for volume
      if (indicatorName === 'VOL') {
        paneOptions = { axis: { gap: { bottom: 2 } }, ...paneOptions }
      }

      const id = chartInstance.createIndicator(
        {
          name: indicatorName,
          createTooltipDataSource: (param): IndicatorTooltipData => {
            const indiStyles = param.chart.getStyles().indicator
            const features = indiStyles.tooltip.features
            const icons: TooltipFeatureStyle[] = []

            // Visibility toggle icon
            icons.push(param.indicator.visible ? features[1] : features[0])
            // Settings icon
            icons.push(features[2])
            // Close icon
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
      )

      if (id && shouldSync) {
        const indicator = chartInstance.getIndicators({ id, name: indicatorName })[0]
        if (indicator) {
          syncIndicator(indicator, isStack, { id, ...paneOptions })
        }
      }

      return id ?? null
    },
    [syncIndicator]
  )

  /**
   * Remove overlay
   */
  const popOverlay = useCallback(
    async (id: string): Promise<void> => {
      const state = await loadState()
      state.overlays = state.overlays.filter((o) => o.id !== id)
      await saveState(state)

      store.instanceApi()?.removeOverlay({ id })
      // Clear selection so floating settings hides
      store.setSelectedOverlay(null)
    },
    [loadState, saveState]
  )

  /**
   * Push overlay with event handlers
   */
  const pushOverlay = useCallback(
    (
      overlay: OverlayCreate & { properties?: DeepPartial<OverlayProperties> },
      paneId?: string,
      redrawing = false
    ): Nullable<string> => {
      const chartInstance = store.instanceApi()
      if (!chartInstance) return null

      // Merge default style template when creating new overlays (not restoring from saved state)
      const effectiveProperties = redrawing
        ? overlay.properties
        : { ...getDefaultForOverlay(overlay.name), ...overlay.properties }

      const id = chartInstance.createOverlay({ ...overlay, paneId }) as Nullable<string>
      if (!id) return null

      const createdOverlay = chartInstance.getOverlays({ id })[0]
      if (!createdOverlay) return id

      // Apply properties to the overlay
      const hasProps = effectiveProperties && Object.keys(effectiveProperties).length > 0
      if (hasProps && 'setProperties' in createdOverlay) {
        // ProOverlay: store in closure Map (read by createPointFigures during render)
        ;(createdOverlay as ProOverlay).setProperties(effectiveProperties, id)
      }

      // Default right-click handler: Ctrl+click deletes, otherwise opens context menu
      const handleRightClick = (event: OverlayEvent<unknown>): boolean => {
        if (event.preventDefault)
          event.preventDefault()
        if (ctrlKeyedDown()) {
          popOverlay(event.overlay.id)
          return true
        }
        useOverlaySettings().openPopup(event, { overlayType: event.overlay.name as OverlayType })
        return true
      }

      // Default double-click handler: opens overlay settings modal
      const handleDoubleClick = (event: OverlayEvent<unknown>): boolean => {
        setPopupOverlay(event.overlay as ProOverlay)
        setShowOverlaySetting(true)
        return true
      }

      // Compute klinecharts-level styles for the overrideOverlay call.
      // For standard overlays (no setProperties), this is how properties take effect.
      // For ProOverlays, a new styles reference forces shouldUpdate() to trigger a re-render
      // so createPointFigures() picks up the updated closure Map.
      const klineStyles = hasProps
        ? ('setProperties' in createdOverlay
            ? { ...(createdOverlay.styles ?? {}) }  // new ref → triggers re-render
            : overlayPropertiesToKlineStyles(effectiveProperties as Partial<OverlayProperties>))
        : undefined

      // Setup event handlers + apply styles in one call
      chartInstance.overrideOverlay({
        id: createdOverlay.id,
        ...(klineStyles ? { styles: klineStyles } : {}),
        onDrawEnd: (event) => {
          // Don't sync temporary overlays like measure tool
          if (!['measure'].includes(createdOverlay.name)) {
            syncOverlay(event.overlay, effectiveProperties)
          }
          return false
        },
        onPressedMoveEnd: (event) => {
          if (!['measure'].includes(createdOverlay.name)) {
            syncOverlay(event.overlay, effectiveProperties)
          }
          return false
        },
        onSelected: (event) => {
          store.setSelectedOverlay(event.overlay)
          store.setSelectedOverlayPosition({
            x: event.pageX ?? 0,
            y: event.pageY ?? 0,
          })
          return false
        },
        onDeselected: () => {
          store.setSelectedOverlay(null)
          return false
        },
        onRightClick: createdOverlay.onRightClick ?? options.onOverlayRightClick ?? handleRightClick,
        onDoubleClick: createdOverlay.onDoubleClick ?? options.onOverlayDoubleClick ?? handleDoubleClick,
      })

      // Sync to storage if not redrawing from saved state
      if (!redrawing) {
        syncOverlay(createdOverlay, effectiveProperties)
      }

      return id
    },
    [syncOverlay, popOverlay, options.onOverlayRightClick, options.onOverlayDoubleClick]
  )

  /**
   * Modify overlay
   */
  const modifyOverlay = useCallback(
    async (id: string, modifyInfo: Partial<OverlayCreate>): Promise<void> => {
      const state = await loadState()
      state.overlays = state.overlays.map((overlay) => {
        if (overlay.id === id) {
          return {
            ...overlay,
            ...modifyInfo,
            paneId: modifyInfo.paneId ?? overlay.paneId,
          } as SavedOverlay
        }
        return overlay
      })
      await saveState(state)

      store.instanceApi()?.overrideOverlay({ ...modifyInfo, id })
    },
    [loadState, saveState]
  )

  /**
   * Modify overlay properties (styles)
   *
   * Visual updates (setProperties + overrideOverlay) and default template updates
   * happen SYNCHRONOUSLY for immediate feedback. Storage persistence is async.
   */
  const modifyOverlayProperties = useCallback(
    async (id: string, properties: DeepPartial<OverlayProperties>): Promise<void> => {
      // 1. Apply visual changes to the chart SYNCHRONOUSLY
      const chartInstance = store.instanceApi()
      const liveOverlay = chartInstance?.getOverlays({ id })[0]
      if (liveOverlay) {
        if ('setProperties' in liveOverlay) {
          // ProOverlay: update closure Map, then force re-render with new styles reference
          ;(liveOverlay as ProOverlay).setProperties(properties, id)
          chartInstance!.overrideOverlay({ id, styles: { ...(liveOverlay.styles ?? {}) } })
        } else {
          // Standard overlay: convert to klinecharts OverlayStyle format
          chartInstance!.overrideOverlay({
            id,
            styles: overlayPropertiesToKlineStyles(properties as Partial<OverlayProperties>),
          })
        }
      }

      // 2. Update default style template SYNCHRONOUSLY
      const overlayName = liveOverlay?.name
      if (overlayName) {
        setDefaultForOverlay(overlayName, properties)
      }

      // 3. Persist to storage ASYNC
      const state = await loadState()
      state.overlays = state.overlays.map((overlay) => {
        if (overlay.id === id) {
          return {
            ...overlay,
            properties: { ...overlay.properties, ...properties },
          }
        }
        return overlay
      })
      if (overlayName) {
        state.overlayDefaults = { ...state.overlayDefaults, [overlayName]: getDefaultForOverlay(overlayName) }
      }
      await saveState(state)
    },
    [loadState, saveState]
  )

  /**
   * Modify overlay figureStyles (per-figure color overrides for structural overlays).
   * Applies visually via overrideOverlay and persists to storage.
   */
  const modifyOverlayFigureStyles = useCallback(
    async (id: string, figureStyles: Record<string, Record<string, unknown>>): Promise<void> => {
      // Apply visual change synchronously
      store.instanceApi()?.overrideOverlay({ id, figureStyles })

      // Persist to storage
      const state = await loadState()
      state.overlays = state.overlays.map((overlay) => {
        if (overlay.id === id) {
          return {
            ...overlay,
            figureStyles: { ...overlay.figureStyles, ...figureStyles },
          }
        }
        return overlay
      })
      await saveState(state)
    },
    [loadState, saveState]
  )

  /**
   * Remove indicator
   */
  const popIndicator = useCallback(
    async (name: string, paneId?: string): Promise<void> => {
      const state = await loadState()
      state.indicators = state.indicators.filter(
        (ind) => !(ind.name === name && ind.paneId === paneId)
      )
      await saveState(state)

      store.instanceApi()?.removeIndicator({ name, paneId })
    },
    [loadState, saveState]
  )

  /**
   * Modify indicator calc params
   */
  const modifyIndicator = useCallback(
    async (name: string, paneId: string, calcParams: unknown[]): Promise<void> => {
      const state = await loadState()
      state.indicators = state.indicators.map((ind) => {
        if (ind.name === name && ind.paneId === paneId) {
          return { ...ind, calcParams }
        }
        return ind
      })
      await saveState(state)

      store.instanceApi()?.overrideIndicator({ name, calcParams, paneId })
    },
    [loadState, saveState]
  )

  /**
   * Add/remove main indicator (on candle pane)
   */
  const toggleMainIndicator = useCallback(
    (name: string, add: boolean): void => {
      const currentMainIndicators = store.mainIndicators()
      const newMainIndicators = [...currentMainIndicators]

      if (add) {
        createIndicator(name, true, { id: 'candle_pane' }, true)
        newMainIndicators.push(name)
      } else {
        popIndicator(name, 'candle_pane')
        const index = newMainIndicators.indexOf(name)
        if (index >= 0) newMainIndicators.splice(index, 1)
      }

      store.setMainIndicators(newMainIndicators)
    },
    [createIndicator, popIndicator]
  )

  /**
   * Add/remove sub indicator (separate pane)
   */
  const toggleSubIndicator = useCallback(
    (name: string, add: boolean, currentPaneId?: string): void => {
      const currentSubIndicators = store.subIndicators()
      const newSubIndicators = { ...currentSubIndicators }

      if (add) {
        const paneId = createIndicator(name, false, undefined, true)
        if (paneId) {
          newSubIndicators[name] = paneId
        }
      } else if (currentPaneId) {
        popIndicator(name, currentPaneId)
        delete newSubIndicators[name]
      }

      store.setSubIndicators(newSubIndicators)
    },
    [createIndicator, popIndicator]
  )

  /**
   * Restore chart state from storage
   */
  const restoreChartState = useCallback(async (): Promise<void> => {
    const chartInstance = store.instanceApi()
    if (!chartInstance) return

    const state = await loadState()

    // Restore overlays
    if (state.overlays.length > 0) {
      for (const overlay of state.overlays) {
        const id = pushOverlay(
          {
            name: overlay.name,
            id: overlay.id,
            groupId: overlay.groupId,
            points: overlay.points.map((p) => ({
              timestamp: p.timestamp,
              value: p.value,
            })),
            lock: overlay.lock,
            visible: overlay.visible,
            mode: overlay.mode,
            extendData: overlay.extendData,
            properties: overlay.properties,
          },
          overlay.paneId,
          true // redrawing = true
        )
        // Restore saved figureStyles (per-figure color overrides)
        if (id && overlay.figureStyles && Object.keys(overlay.figureStyles).length > 0) {
          chartInstance.overrideOverlay({ id, figureStyles: overlay.figureStyles })
        }
        // Restore timeframe visibility to runtime store
        if (id && overlay.timeframeVisibility) {
          setOverlayTimeframeVisibility(id, overlay.timeframeVisibility)
        }
      }

      // Apply timeframe visibility filtering for the current period
      const currentPeriod = store.period()
      if (currentPeriod) {
        const visibilityMap = getAllOverlayTimeframeVisibility()
        visibilityMap.forEach((visibility, overlayId) => {
          const shouldBeVisible = isOverlayVisibleForPeriod(visibility, currentPeriod)
          chartInstance.overrideOverlay({ id: overlayId, visible: shouldBeVisible })
        })
      }
    }

    // Restore indicators (with delay to let chart initialize)
    if (state.indicators.length > 0) {
      setTimeout(() => {
        const newMainIndicators: string[] = []
        const newSubIndicators: Record<string, string> = {}

        for (const indicator of state.indicators) {
          chartInstance.createIndicator(
            {
              name: indicator.name,
              calcParams: indicator.calcParams,
              visible: indicator.visible,
              styles: indicator.styles as DeepPartial<Record<string, unknown>>,
            },
            indicator.isStack,
            indicator.paneOptions
          )

          if (indicator.paneId === 'candle_pane') {
            newMainIndicators.push(indicator.name)
          } else {
            newSubIndicators[indicator.name] = indicator.paneId
          }
        }

        store.setMainIndicators(newMainIndicators)
        store.setSubIndicators(newSubIndicators)
      }, 500)
    }

    // Restore overlay default style templates
    if (state.overlayDefaults && Object.keys(state.overlayDefaults).length > 0) {
      setOverlayDefaults(state.overlayDefaults)
    }

    // Restore styles
    if (state.styles && Object.keys(state.styles).length > 0) {
      chartInstance.setStyles(state.styles)
      store.setStyles(state.styles)
    }
  }, [loadState, pushOverlay])

  /**
   * Clear all saved state
   */
  const clearState = useCallback(async (): Promise<void> => {
    stateCache.current = createEmptyChartState()
    const adapter = store.storageAdapter()
    const key = store.storageKey()
    if (adapter) {
      await adapter.delete(key)
    }
  }, [])

  return {
    // Indicator methods
    createIndicator,
    syncIndicator,
    modifyIndicator,
    popIndicator,
    toggleMainIndicator,
    toggleSubIndicator,

    // Overlay methods
    pushOverlay,
    syncOverlay,
    modifyOverlay,
    modifyOverlayProperties,
    modifyOverlayFigureStyles,
    popOverlay,

    // State management
    loadState,
    saveState,
    restoreChartState,
    clearState,
  }
}
