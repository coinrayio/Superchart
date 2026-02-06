/**
 * useBackendIndicators - Hook for managing backend-driven indicator subscriptions
 *
 * Implements the "calc bridge" pattern: registers unique klinecharts IndicatorTemplates
 * per backend subscription whose calc() function reads from an async-populated data Map.
 *
 * Data flow:
 *   Backend Provider → onData/onTick → Map<timestamp, IndicatorDataPoint>
 *   klinecharts calc() → reads Map → returns values array → renders figures
 */

import { useCallback, useRef, useState, useEffect, useMemo } from 'react'
import { registerIndicator } from 'klinecharts'
import type { KLineData, IndicatorFigure } from 'klinecharts'
import * as store from '../store/chartStore'
import type {
  IndicatorDefinition,
  IndicatorSubscription,
  IndicatorMetadata,
  IndicatorDataPoint,
  ActiveIndicator,
  SettingValue,
  IndicatorPlot,
  PlotLine,
  PlotHistogram,
} from '../types/indicator'

/** Prefix for all backend indicator template names */
const BACKEND_PREFIX = 'BACKEND_'

/**
 * Generate a unique template name for a backend indicator subscription
 */
function templateName(indicatorId: string): string {
  return `${BACKEND_PREFIX}${indicatorId}`
}

/**
 * Translate IndicatorPlot definitions to klinecharts IndicatorFigure array
 */
function translatePlotsToFigures(plots: IndicatorPlot[]): IndicatorFigure[] {
  const figures: IndicatorFigure[] = []

  for (const plot of plots) {
    switch (plot.type) {
      case 'plot': {
        const p = plot as PlotLine
        figures.push({
          key: p.id,
          title: `${p.title}: `,
          type: p.style === 'circles' ? 'circle' : 'line',
        })
        break
      }

      case 'histogram': {
        const h = plot as PlotHistogram
        figures.push({
          key: h.id,
          title: `${h.title}: `,
          type: 'bar',
          baseValue: h.histBase ?? 0,
        })
        break
      }

      case 'hline':
        // Horizontal lines are handled in the draw callback, not as figures
        break

      case 'plotshape':
      case 'plotchar':
      case 'plotarrow': {
        // Shapes/chars/arrows rendered as circle figures (fallback)
        if ('id' in plot) {
          figures.push({
            key: (plot as { id: string }).id,
            title: '',
            type: 'circle',
          })
        }
        break
      }

      case 'plotcandle': {
        // Candle plot needs OHLC keys
        const c = plot as { id: string; title?: string }
        figures.push(
          { key: `${c.id}_open`, title: 'O: ', type: 'line' },
          { key: `${c.id}_high`, title: 'H: ', type: 'line' },
          { key: `${c.id}_low`, title: 'L: ', type: 'line' },
          { key: `${c.id}_close`, title: 'C: ', type: 'line' },
        )
        break
      }

      case 'fill':
      case 'bgcolor':
        // Handled in draw callback
        break
    }
  }

  return figures
}

/**
 * Create a klinecharts calc function that reads from the backend data store
 */
function createCalcFunction(
  metadata: IndicatorMetadata,
  dataStore: Map<number, IndicatorDataPoint>
) {
  // Extract all plot IDs that have figure representations
  const plotIds: string[] = []
  for (const plot of metadata.plots) {
    if ('id' in plot) {
      const id = (plot as { id: string }).id
      if (plot.type === 'plotcandle') {
        plotIds.push(`${id}_open`, `${id}_high`, `${id}_low`, `${id}_close`)
      } else if (plot.type !== 'hline' && plot.type !== 'fill' && plot.type !== 'bgcolor') {
        plotIds.push(id)
      }
    }
  }

  return (dataList: KLineData[]) => {
    return dataList.map((kline) => {
      const point = dataStore.get(kline.timestamp)
      const result: Record<string, number | null> = {}

      if (!point) {
        // Return nulls for all plot IDs when no data
        for (const id of plotIds) {
          result[id] = null
        }
        return result
      }

      // Map values from the data point
      for (const [plotId, value] of Object.entries(point.values)) {
        // Check if this is a candle plot
        if (point.ohlc?.[plotId]) {
          const ohlc = point.ohlc[plotId]
          result[`${plotId}_open`] = ohlc.open
          result[`${plotId}_high`] = ohlc.high
          result[`${plotId}_low`] = ohlc.low
          result[`${plotId}_close`] = ohlc.close
        } else {
          result[plotId] = value
        }
      }

      return result
    })
  }
}

export interface UseBackendIndicatorsReturn {
  /** List of available backend indicators (fetched from provider) */
  availableIndicators: IndicatorDefinition[]
  /** Names of currently active backend indicators */
  activeIndicatorNames: string[]
  /** Add a backend indicator to the chart */
  addBackendIndicator: (definition: IndicatorDefinition, settings?: Record<string, SettingValue>) => Promise<void>
  /** Remove a backend indicator from the chart */
  removeBackendIndicator: (indicatorName: string) => Promise<void>
  /** Update backend indicator settings */
  updateBackendSettings: (indicatorName: string, settings: Record<string, SettingValue>) => Promise<void>
  /** Get the active indicator by name (for settings modal) */
  getActiveIndicator: (name: string) => ActiveIndicator | undefined
  /** Called when symbol/period changes */
  handleSymbolPeriodChange: () => Promise<void>
  /** Restore backend indicators from saved state */
  restoreBackendIndicators: () => Promise<void>
  /** Dispose all backend indicators */
  disposeAll: () => void
}

/**
 * Hook for managing backend indicator subscriptions and data flow
 */
export function useBackendIndicators(): UseBackendIndicatorsReturn {
  // Active indicator subscriptions keyed by indicator name
  const activeRef = useRef<Map<string, ActiveIndicator>>(new Map())
  const subscriptionsRef = useRef<Map<string, IndicatorSubscription>>(new Map())
  const definitionsRef = useRef<Map<string, IndicatorDefinition>>(new Map())

  const [availableIndicators, setAvailableIndicators] = useState<IndicatorDefinition[]>([])
  const [activeNames, setActiveNames] = useState<string[]>([])

  // Fetch available indicators on mount (if provider exists)
  useEffect(() => {
    const provider = store.indicatorProvider()
    if (!provider) return

    provider.getAvailableIndicators().then((defs) => {
      setAvailableIndicators(defs)
      // Cache definitions for restore
      for (const def of defs) {
        definitionsRef.current.set(def.name, def)
      }
    }).catch((err) => {
      console.error('Failed to fetch available indicators:', err)
    })
  }, [])

  /**
   * Update the reactive active names list
   */
  const updateActiveNames = useCallback(() => {
    setActiveNames(Array.from(activeRef.current.keys()))
  }, [])

  /**
   * Save a backend indicator to storage
   */
  const syncToStorage = useCallback(async (active: ActiveIndicator) => {
    const adapter = store.storageAdapter()
    const key = store.storageKey()
    if (!adapter) return

    const state = await adapter.load(key)
    if (!state) return

    const saved = {
      id: active.indicatorId,
      name: active.name,
      paneId: active.paneId,
      settings: active.settings,
      visible: active.visible,
    }

    const existingIndex = state.indicators.findIndex(
      (ind) => ind.name === active.name && ind.settings
    )

    if (existingIndex >= 0) {
      state.indicators[existingIndex] = saved
    } else {
      state.indicators.push(saved)
    }

    state.savedAt = Date.now()
    await adapter.save(key, state)
  }, [])

  /**
   * Remove a backend indicator from storage
   */
  const removeFromStorage = useCallback(async (indicatorName: string) => {
    const adapter = store.storageAdapter()
    const key = store.storageKey()
    if (!adapter) return

    const state = await adapter.load(key)
    if (!state) return

    state.indicators = state.indicators.filter(
      (ind) => !(ind.name === indicatorName && ind.settings)
    )
    state.savedAt = Date.now()
    await adapter.save(key, state)
  }, [])

  /**
   * Add a backend indicator to the chart
   */
  const addBackendIndicator = useCallback(async (
    definition: IndicatorDefinition,
    settings?: Record<string, SettingValue>
  ) => {
    const provider = store.indicatorProvider()
    const symbolInfo = store.symbol()
    const periodInfo = store.period()
    if (!provider || !symbolInfo || !periodInfo) return

    // Don't add duplicate
    if (activeRef.current.has(definition.name)) return

    const resolvedSettings = settings ?? definition.defaultSettings

    // Subscribe to the provider
    const subscription = await provider.subscribe({
      indicatorName: definition.name,
      symbol: symbolInfo,
      period: periodInfo,
      settings: resolvedSettings,
    })

    // Create data store for this indicator
    const dataStore = new Map<number, IndicatorDataPoint>()

    // Register custom klinecharts indicator template
    const name = templateName(subscription.indicatorId)
    const figures = translatePlotsToFigures(subscription.metadata.plots)
    const calc = createCalcFunction(subscription.metadata, dataStore)

    registerIndicator({
      name,
      shortName: subscription.metadata.shortName,
      precision: subscription.metadata.precision,
      minValue: subscription.metadata.minValue ?? undefined,
      maxValue: subscription.metadata.maxValue ?? undefined,
      figures,
      calc,
    })

    // Create the indicator on the chart
    const chart = store.instanceApi()
    if (!chart) return

    const isOverlay = subscription.metadata.paneId === 'candle_pane'
    const paneId = chart.createIndicator(
      { name },
      isOverlay,
      isOverlay ? { id: 'candle_pane' } : undefined
    )

    // Create ActiveIndicator record
    const active: ActiveIndicator = {
      indicatorId: subscription.indicatorId,
      name: definition.name,
      metadata: subscription.metadata,
      settings: resolvedSettings,
      data: dataStore,
      timestamps: [],
      visible: true,
      paneId: isOverlay ? 'candle_pane' : (paneId ?? ''),
      chartIndicatorId: paneId ?? undefined,
    }

    activeRef.current.set(definition.name, active)
    subscriptionsRef.current.set(definition.name, subscription)
    definitionsRef.current.set(definition.name, definition)

    // Wire up data handlers
    subscription.onData((points: IndicatorDataPoint[]) => {
      dataStore.clear()
      const timestamps: number[] = []
      for (const point of points) {
        dataStore.set(point.timestamp, point)
        timestamps.push(point.timestamp)
      }
      timestamps.sort((a, b) => a - b)
      active.timestamps = timestamps

      // Force klinecharts to recalculate
      chart.overrideIndicator({ name })
    })

    subscription.onTick((point: IndicatorDataPoint) => {
      dataStore.set(point.timestamp, point)
      if (!active.timestamps.includes(point.timestamp)) {
        active.timestamps.push(point.timestamp)
        active.timestamps.sort((a, b) => a - b)
      }

      // Force recalc
      chart.overrideIndicator({ name })
    })

    subscription.onError?.((error: Error) => {
      console.error(`Backend indicator ${definition.name} error:`, error)
    })

    updateActiveNames()
    syncToStorage(active)
  }, [updateActiveNames, syncToStorage])

  /**
   * Remove a backend indicator from the chart
   */
  const removeBackendIndicator = useCallback(async (indicatorName: string) => {
    const provider = store.indicatorProvider()
    const chart = store.instanceApi()
    const active = activeRef.current.get(indicatorName)

    if (!active) return

    // Unsubscribe from provider
    if (provider) {
      await provider.unsubscribe(active.indicatorId)
    }

    // Remove from chart
    if (chart) {
      chart.removeIndicator({ name: templateName(active.indicatorId) })
    }

    // Clean up state
    activeRef.current.delete(indicatorName)
    subscriptionsRef.current.delete(indicatorName)
    updateActiveNames()
    removeFromStorage(indicatorName)
  }, [updateActiveNames, removeFromStorage])

  /**
   * Update backend indicator settings
   */
  const updateBackendSettings = useCallback(async (
    indicatorName: string,
    settings: Record<string, SettingValue>
  ) => {
    const provider = store.indicatorProvider()
    const active = activeRef.current.get(indicatorName)
    if (!provider || !active) return

    await provider.updateSettings(active.indicatorId, settings)
    active.settings = settings
    updateActiveNames()
    syncToStorage(active)
  }, [updateActiveNames, syncToStorage])

  /**
   * Get active indicator by name
   */
  const getActiveIndicator = useCallback((name: string): ActiveIndicator | undefined => {
    return activeRef.current.get(name)
  }, [])

  /**
   * Handle symbol/period changes - resubscribe all active indicators
   */
  const handleSymbolPeriodChange = useCallback(async () => {
    const provider = store.indicatorProvider()
    const symbolInfo = store.symbol()
    const periodInfo = store.period()
    if (!provider || !symbolInfo || !periodInfo) return

    const activeList = Array.from(activeRef.current.values())
    if (activeList.length === 0) return

    if (provider.onSymbolPeriodChange) {
      // Provider handles batch resubscription
      await provider.onSymbolPeriodChange(
        symbolInfo,
        periodInfo,
        activeList.map((a) => ({
          indicatorId: a.indicatorId,
          name: a.name,
          settings: a.settings,
        }))
      )

      // Clear data stores - new data will arrive via existing handlers
      for (const active of activeList) {
        active.data.clear()
        active.timestamps = []
      }
    } else {
      // Manual resubscription: remove all, re-add all
      const chart = store.instanceApi()

      // Unsubscribe and remove from chart
      for (const active of activeList) {
        await provider.unsubscribe(active.indicatorId)
        if (chart) {
          chart.removeIndicator({ name: templateName(active.indicatorId) })
        }
      }

      // Clear internal state
      activeRef.current.clear()
      subscriptionsRef.current.clear()

      // Re-add each with its cached definition and settings
      for (const active of activeList) {
        const def = definitionsRef.current.get(active.name)
        if (def) {
          await addBackendIndicator(def, active.settings)
        }
      }
    }
  }, [addBackendIndicator])

  /**
   * Restore backend indicators from saved state
   */
  const restoreBackendIndicators = useCallback(async () => {
    const provider = store.indicatorProvider()
    if (!provider) return

    const adapter = store.storageAdapter()
    const key = store.storageKey()
    if (!adapter) return

    const state = await adapter.load(key)
    if (!state) return

    // Backend indicators have `settings` field but no `calcParams`
    const backendSaved = state.indicators.filter(
      (ind) => ind.settings && !ind.calcParams
    )

    if (backendSaved.length === 0) return

    // Ensure definitions are loaded
    let defs = definitionsRef.current
    if (defs.size === 0) {
      const fetchedDefs = await provider.getAvailableIndicators()
      setAvailableIndicators(fetchedDefs)
      for (const def of fetchedDefs) {
        defs.set(def.name, def)
      }
    }

    // Restore each backend indicator
    for (const saved of backendSaved) {
      const def = defs.get(saved.name)
      if (def) {
        await addBackendIndicator(def, saved.settings)
      }
    }
  }, [addBackendIndicator])

  /**
   * Dispose all backend indicators
   */
  const disposeAll = useCallback(() => {
    const provider = store.indicatorProvider()
    const chart = store.instanceApi()

    for (const [, active] of activeRef.current) {
      provider?.unsubscribe(active.indicatorId)
      if (chart) {
        chart.removeIndicator({ name: templateName(active.indicatorId) })
      }
    }

    activeRef.current.clear()
    subscriptionsRef.current.clear()
    setActiveNames([])
  }, [])

  return useMemo(() => ({
    availableIndicators,
    activeIndicatorNames: activeNames,
    addBackendIndicator,
    removeBackendIndicator,
    updateBackendSettings,
    getActiveIndicator,
    handleSymbolPeriodChange,
    restoreBackendIndicators,
    disposeAll,
  }), [
    availableIndicators,
    activeNames,
    addBackendIndicator,
    removeBackendIndicator,
    updateBackendSettings,
    getActiveIndicator,
    handleSymbolPeriodChange,
    restoreBackendIndicators,
    disposeAll,
  ])
}
