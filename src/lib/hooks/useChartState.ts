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
import { useChartStore } from '../store/chartStoreContext'
import type { ChartState, SavedIndicator } from '../types/storage'
import type { SavedOverlay, OverlayProperties, ProOverlay } from '../types/overlay'
import { isOverlayVisibleForPeriod } from '../types/overlay'
import { createEmptyChartState, mergeChartStates, StorageConflictError } from '../types/storage'
import { ctrlKeyedDown } from '../store/keyEventStore'
import type { OverlayType } from '../store/chartStore'
import { getDefaultForOverlay, setDefaultForOverlay, setOverlayDefaults } from '../store/overlayDefaultStyles'
import { overlayPropertiesToKlineStyles } from '../widget/overlay/overlayPropertySchemas'

/**
 * Convert Overlay to SavedOverlay format
 * `getVisibility` is the per-instance visibility lookup from ChartStore.
 */
function overlayToSaved(
  overlay: Overlay,
  getVisibility: (id: string) => import('../types/overlay').TimeframeVisibility | undefined,
  properties?: DeepPartial<OverlayProperties>,
  figureStyles?: Record<string, Record<string, unknown>>
): SavedOverlay {
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
  const tfVisibility = getVisibility(overlay.id)
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

/** Maximum number of merge-retry attempts for a single mutation. */
const SAVE_RETRY_LIMIT = 3

/**
 * Hook for managing chart state persistence
 */
export function useChartState(options: UseChartStateOptions = {}) {
  const store = useChartStore()
  // Cache for current state + revision to avoid excessive storage reads.
  // Revision is null when no adapter is configured or no record exists yet.
  const stateCache = useRef<ChartState | null>(null)
  const revisionCache = useRef<number | null>(null)

  /**
   * Load state from storage (or in-memory cache when no adapter is configured).
   * Always returns a non-null ChartState — synthesizes an empty state if none
   * exists yet.
   */
  const loadState = useCallback(async (): Promise<ChartState> => {
    const adapter = store.storageAdapter()
    const key = store.storageKey()

    if (!adapter) {
      stateCache.current = stateCache.current ?? createEmptyChartState()
      return stateCache.current
    }

    const record = await adapter.load(key)
    if (record) {
      stateCache.current = record.state
      revisionCache.current = record.revision
    } else {
      stateCache.current = createEmptyChartState()
      revisionCache.current = null
    }
    return stateCache.current
  }, [])

  /**
   * Save state to storage unconditionally (last-write-wins). Updates the
   * revision cache. Used by `clearState` and as a fallback when no adapter
   * is configured (cache-only).
   */
  const saveState = useCallback(
    async (state: ChartState): Promise<void> => {
      stateCache.current = state
      store.setChartModified(true)

      const adapter = store.storageAdapter()
      const key = store.storageKey()

      if (adapter) {
        state.savedAt = Date.now()
        const result = await adapter.save(key, state)
        revisionCache.current = result.revision
      }
    },
    []
  )

  /**
   * Apply a mutation to the saved chart state with optimistic concurrency.
   *
   * Pattern: load → mutate → save with `expectedRevision`. If another writer
   * advanced the revision in the meantime, the adapter throws
   * `StorageConflictError`; we merge their state with ours via
   * `mergeChartStates` (array-merge by id for indicators/overlays, last-
   * write-wins on scalars), replay the mutation atop the merged base, and
   * retry up to `SAVE_RETRY_LIMIT` times.
   *
   * On retry exhaustion the error is reported via `onStorageError` if
   * configured, then re-thrown so calling sites that await can observe it.
   */
  const withMergeRetry = useCallback(
    async (mutate: (state: ChartState) => ChartState): Promise<void> => {
      const adapter = store.storageAdapter()
      const key = store.storageKey()

      // No adapter — pure in-memory: just apply and cache.
      if (!adapter) {
        const base = stateCache.current ?? createEmptyChartState()
        stateCache.current = mutate(base)
        store.setChartModified(true)
        return
      }

      let lastError: unknown
      for (let attempt = 0; attempt < SAVE_RETRY_LIMIT; attempt++) {
        // Read fresh on every attempt so we always start from the latest known
        // revision. Without this we'd loop with stale `revisionCache` after the
        // first conflict.
        const record = await adapter.load(key)
        const base = record?.state ?? createEmptyChartState()
        const expectedRevision = record?.revision

        const next = mutate(base)
        next.savedAt = Date.now()

        try {
          const result = await adapter.save(key, next, expectedRevision)
          stateCache.current = next
          revisionCache.current = result.revision
          store.setChartModified(true)
          return
        } catch (err) {
          lastError = err
          if (err instanceof StorageConflictError) {
            // Merge remote into our local result and retry. The next loop
            // iteration will re-load (now matching the conflict's revision)
            // and re-apply mutate to ensure idempotency.
            stateCache.current = mergeChartStates(next, err.remoteState)
            revisionCache.current = err.remoteRevision
            continue
          }
          throw err
        }
      }

      // Retries exhausted — surface to the consumer if they registered a handler
      const onStorageError = store.onStorageError()
      if (onStorageError && lastError instanceof Error) {
        onStorageError(lastError)
      }
      throw lastError ?? new Error('Storage save failed after retries')
    },
    []
  )

  /**
   * Sync indicator to storage
   */
  const syncIndicator = useCallback(
    async (indicator: Indicator, isStack?: boolean, paneOptions?: PaneOptions): Promise<void> => {
      const saved = indicatorToSaved(indicator, isStack, paneOptions)
      const targetPaneId = paneOptions?.id ?? indicator.paneId
      await withMergeRetry((state) => {
        const next = { ...state, indicators: [...state.indicators] }
        const existingIndex = next.indicators.findIndex(
          (ind) => ind.name === indicator.name && ind.paneId === targetPaneId
        )
        if (existingIndex >= 0) {
          next.indicators[existingIndex] = saved
        } else {
          next.indicators.push(saved)
        }
        return next
      })
    },
    [withMergeRetry]
  )

  /**
   * Sync overlay to storage
   */
  const syncOverlay = useCallback(
    async (overlay: Overlay, properties?: DeepPartial<OverlayProperties>): Promise<void> => {
      const saved = overlayToSaved(overlay, store.getOverlayTimeframeVisibility, properties)
      await withMergeRetry((state) => {
        const next = { ...state, overlays: [...state.overlays] }
        const existingIndex = next.overlays.findIndex((o) => o.id === overlay.id)
        if (existingIndex >= 0) {
          next.overlays[existingIndex] = saved
        } else {
          next.overlays.push(saved)
        }
        return next
      })
    },
    [withMergeRetry, store]
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
      await withMergeRetry((state) => ({
        ...state,
        overlays: state.overlays.filter((o) => o.id !== id),
      }))

      store.instanceApi()?.removeOverlay({ id })
      // Clear selection so floating settings hides
      store.setSelectedOverlay(null)
    },
    [withMergeRetry, store]
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
        store.openOverlayPopup(
          event.pageX ?? 0,
          event.pageY ?? 0,
          event.overlay,
          { overlayType: event.overlay.name as OverlayType }
        )
        return true
      }

      // Default double-click handler: opens overlay settings modal
      const handleDoubleClick = (event: OverlayEvent<unknown>): boolean => {
        store.setPopupOverlay(event.overlay as ProOverlay)
        store.setShowOverlaySetting(true)
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
      await withMergeRetry((state) => ({
        ...state,
        overlays: state.overlays.map((overlay) =>
          overlay.id === id
            ? ({
                ...overlay,
                ...modifyInfo,
                paneId: modifyInfo.paneId ?? overlay.paneId,
              } as SavedOverlay)
            : overlay
        ),
      }))

      store.instanceApi()?.overrideOverlay({ ...modifyInfo, id })
    },
    [withMergeRetry, store]
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

      // 3. Persist to storage ASYNC (with merge-retry)
      await withMergeRetry((state) => {
        const next = {
          ...state,
          overlays: state.overlays.map((overlay) =>
            overlay.id === id
              ? { ...overlay, properties: { ...overlay.properties, ...properties } }
              : overlay
          ),
        }
        if (overlayName) {
          next.overlayDefaults = {
            ...state.overlayDefaults,
            [overlayName]: getDefaultForOverlay(overlayName),
          }
        }
        return next
      })
    },
    [withMergeRetry, store]
  )

  /**
   * Modify overlay figureStyles (per-figure color overrides for structural overlays).
   * Applies visually via overrideOverlay and persists to storage.
   */
  const modifyOverlayFigureStyles = useCallback(
    async (id: string, figureStyles: Record<string, Record<string, unknown>>): Promise<void> => {
      // Apply visual change synchronously
      store.instanceApi()?.overrideOverlay({ id, figureStyles })

      // Persist to storage (with merge-retry)
      await withMergeRetry((state) => ({
        ...state,
        overlays: state.overlays.map((overlay) =>
          overlay.id === id
            ? { ...overlay, figureStyles: { ...overlay.figureStyles, ...figureStyles } }
            : overlay
        ),
      }))
    },
    [withMergeRetry, store]
  )

  /**
   * Remove indicator
   */
  const popIndicator = useCallback(
    async (name: string, paneId?: string): Promise<void> => {
      await withMergeRetry((state) => ({
        ...state,
        indicators: state.indicators.filter(
          (ind) => !(ind.name === name && ind.paneId === paneId)
        ),
      }))

      store.instanceApi()?.removeIndicator({ name, paneId })
    },
    [withMergeRetry, store]
  )

  /**
   * Modify indicator calc params
   */
  const modifyIndicator = useCallback(
    async (name: string, paneId: string, calcParams: unknown[]): Promise<void> => {
      await withMergeRetry((state) => ({
        ...state,
        indicators: state.indicators.map((ind) =>
          ind.name === name && ind.paneId === paneId ? { ...ind, calcParams } : ind
        ),
      }))

      store.instanceApi()?.overrideIndicator({ name, calcParams, paneId })
    },
    [withMergeRetry, store]
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
        // Restore timeframe visibility to per-instance store
        if (id && overlay.timeframeVisibility) {
          store.setOverlayTimeframeVisibility(id, overlay.timeframeVisibility)
        }
      }

      // Apply timeframe visibility filtering for the current period
      const currentPeriod = store.period()
      if (currentPeriod) {
        const visibilityMap = store.getAllOverlayTimeframeVisibility()
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
