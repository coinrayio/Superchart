/**
 * Overlay Settings Modal
 *
 * TradingView-style tabbed property editor for overlays.
 * Three tabs: Style (property editor), Coordinates (point editor), Visibility (placeholder).
 *
 * Uses local state for field values so edits are instant (no async lag).
 * Syncs to overlay via modifyOverlayProperties() in the background.
 */

import { useState, useEffect, useSyncExternalStore } from 'react'
import { Color, Input, Select, Modal, type SelectDataSourceItem } from '../../component'
import { useChartState } from '../../hooks/useChartState'
import {
  popupOverlay,
  subscribePopupOverlay,
  setShowOverlaySetting,
  getOverlayType,
  getOverlayTimeframeVisibility,
  setOverlayTimeframeVisibility,
} from '../../store/overlaySettingStore'
import { setDefaultForOverlay } from '../../store/overlayDefaultStyles'
import * as store from '../../store/chartStore'
import {
  getOverlayPropertySchema,
  klineStylesToOverlayProperties,
  WIDTH_PX_OPTIONS,
  FONT_SIZE_OPTIONS,
  type PropertyFieldSchema,
  type FigureFieldSchema,
  type LevelSchemaConfig,
} from './overlayPropertySchemas'
import type { ProOverlay } from '../../types/overlay'
import type { DeepPartial, FigureLevel } from 'klinecharts'
import type { OverlayProperties } from '../../types/overlay'
import {
  type TimeframeVisibility,
  type PeriodCategory,
  defaultTimeframeVisibility,
  isOverlayVisibleForPeriod,
  PERIOD_CATEGORIES,
  PERIOD_CATEGORY_LABELS,
  TIMEFRAME_SPANS,
  formatSpan,
} from '../../types/overlay'

import './index.less'

type SettingsTab = 'style' | 'coordinates' | 'visibility'

/** Overlays that support extend left/right (have rendering support in coinray-chart) */
const EXTEND_CAPABLE_OVERLAYS = new Set([
  'segment',
  'fibonacciSegment',
  'fibonacciExtension',
])

function OverlaySettingModal() {
  const overlay = useSyncExternalStore(subscribePopupOverlay, popupOverlay, popupOverlay) as ProOverlay | undefined
  const { modifyOverlayProperties, modifyOverlayFigureStyles, syncOverlay } = useChartState()

  const [activeTab, setActiveTab] = useState<SettingsTab>('style')

  // Local state for property values — avoids async lag when editing
  const [localProps, setLocalProps] = useState<Record<string, unknown>>({})

  // Local state for figure-level overrides (structural overlays)
  const [localFigureStyles, setLocalFigureStyles] = useState<Record<string, Record<string, unknown>>>({})

  // Local state for configurable levels (fibonacci overlays)
  const [localLevels, setLocalLevels] = useState<FigureLevel[]>([])

  // Local state for coordinate points (Coordinates tab)
  const [localPoints, setLocalPoints] = useState<Array<{ price: number; bar: number }>>([])

  // Local state for timeframe visibility (Visibility tab)
  const [localVisibility, setLocalVisibility] = useState<TimeframeVisibility>(defaultTimeframeVisibility)

  // Local state for extend left/right
  const [localExtend, setLocalExtend] = useState<{ extendLeft: boolean; extendRight: boolean }>({ extendLeft: false, extendRight: false })

  // Initialize local props when overlay changes
  useEffect(() => {
    if (!overlay) return
    setActiveTab('style')

    const props = overlay.getProperties
      ? overlay.getProperties(overlay.id)
      : klineStylesToOverlayProperties(overlay.styles as Record<string, unknown> | undefined)
    setLocalProps(props as Record<string, unknown>)

    // Initialize figure styles from overlay
    const baseFigStyles = (overlay.figureStyles as Record<string, Record<string, unknown>>) ?? {}
    setLocalFigureStyles(baseFigStyles)

    // Initialize levels from properties, and sync level colors → figureStyles
    const schema = getOverlayPropertySchema(overlay.name)
    if (schema.levelConfig) {
      const overlayLevels = (props as Record<string, unknown>).figureLevels as FigureLevel[] | undefined
      const levels = (overlayLevels?.length ?? 0) > 0
        ? overlayLevels!
        : schema.levelConfig.defaultLevels.map(l => ({ ...l }))
      setLocalLevels(levels)
      // Project level colors into figureStyles for rendering
      // Lines use 'color' for stroke; circles/arcs use 'borderColor' for stroke
      const colorProp = schema.levelConfig.figureType === 'line' ? 'color' : 'borderColor'
      const figStyles = { ...baseFigStyles }
      let figStylesChanged = false
      levels.forEach(l => {
        if (l.color) {
          const figKey = `${schema.levelConfig!.keyPrefix}_${l.value ?? 0}`
          const prev = figStyles[figKey] ?? {}
          figStyles[figKey] = { ...prev, [colorProp]: l.color }
          if (prev[colorProp] !== l.color) figStylesChanged = true
        }
      })
      if (figStylesChanged) {
        setLocalFigureStyles(figStyles)
        modifyOverlayFigureStyles(overlay.id, figStyles)
      }
    }

    // Initialize coordinate points
    const chartInstance = store.instanceApi()
    if (chartInstance) {
      const points = overlay.points.map(p => ({
        price: p.value ?? 0,
        bar: p.dataIndex ?? 0,
      }))
      setLocalPoints(points)
    }

    // Initialize timeframe visibility from runtime store
    const savedVisibility = getOverlayTimeframeVisibility(overlay.id)
    setLocalVisibility(savedVisibility ?? defaultTimeframeVisibility())

    // Initialize extend state from overlay.extendData
    const ext = overlay.extendData as { extendLeft?: boolean; extendRight?: boolean } | undefined
    setLocalExtend({
      extendLeft: ext?.extendLeft === true,
      extendRight: ext?.extendRight === true,
    })
  }, [overlay?.id])

  if (!overlay) return null

  const overlayName = overlay.name
  const schema = getOverlayPropertySchema(overlayName)

  const handleFieldChange = (field: PropertyFieldSchema, value: unknown) => {
    setLocalProps(prev => ({ ...prev, [field.key]: value }))
    modifyOverlayProperties(overlay.id, { [field.key]: value } as DeepPartial<OverlayProperties>)
  }

  const handleFigureColorChange = (figureKey: string, color: string) => {
    setLocalFigureStyles(prev => {
      const updated = { ...prev, [figureKey]: { ...(prev[figureKey] ?? {}), color } }
      modifyOverlayFigureStyles(overlay.id, updated)
      return updated
    })
  }

  const handleLevelToggle = (index: number, enabled: boolean) => {
    setLocalLevels(prev => {
      const updated = prev.map((l, i) => i === index ? { ...l, enabled } : l)
      modifyOverlayProperties(overlay.id, { figureLevels: updated } as DeepPartial<OverlayProperties>)
      return updated
    })
  }

  const handleLevelColorChange = (index: number, color: string) => {
    setLocalLevels(prev => {
      const updated = prev.map((l, i) => i === index ? { ...l, color } : l)
      modifyOverlayProperties(overlay.id, { figureLevels: updated } as DeepPartial<OverlayProperties>)
      // Also propagate to figureStyles so the renderer picks up per-level colors
      if (schema.levelConfig) {
        const level = updated[index]
        const figKey = `${schema.levelConfig.keyPrefix}_${level.value ?? 0}`
        // Lines use 'color', circles/arcs use 'borderColor' for stroke
        const colorProp = schema.levelConfig.figureType === 'line' ? 'color' : 'borderColor'
        setLocalFigureStyles(prev2 => {
          const entry = { ...(prev2[figKey] ?? {}), [colorProp]: color }
          const merged = { ...prev2, [figKey]: entry }
          modifyOverlayFigureStyles(overlay.id, merged)
          return merged
        })
      }
      return updated
    })
  }

  const handleLevelValueChange = (index: number, value: number) => {
    setLocalLevels(prev => {
      const updated = prev.map((l, i) => i === index ? { ...l, value } : l)
      modifyOverlayProperties(overlay.id, { figureLevels: updated } as DeepPartial<OverlayProperties>)
      return updated
    })
  }

  const handleAddLevel = () => {
    if (schema.levelConfig && localLevels.length < schema.levelConfig.maxLevels) {
      setLocalLevels(prev => {
        const updated = [...prev, { value: 0, enabled: true }]
        modifyOverlayProperties(overlay.id, { figureLevels: updated } as DeepPartial<OverlayProperties>)
        return updated
      })
    }
  }

  const handleRemoveLevel = (index: number) => {
    setLocalLevels(prev => {
      const updated = prev.filter((_, i) => i !== index)
      modifyOverlayProperties(overlay.id, { figureLevels: updated } as DeepPartial<OverlayProperties>)
      return updated
    })
  }

  const handleCoordinateChange = (pointIndex: number, field: 'value' | 'dataIndex', newValue: number) => {
    const chartInstance = store.instanceApi()
    if (!chartInstance) return

    const currentPoints = [...overlay.points]
    const point = { ...currentPoints[pointIndex] }

    if (field === 'value') {
      point.value = newValue
    } else {
      const dataList = chartInstance.getDataList()
      if (newValue >= 0 && newValue < dataList.length) {
        point.timestamp = dataList[newValue].timestamp
        point.dataIndex = newValue
      }
    }

    currentPoints[pointIndex] = point

    // Apply visually
    chartInstance.overrideOverlay({ id: overlay.id, points: currentPoints })

    // Persist: re-read live overlay and sync
    const liveOverlay = chartInstance.getOverlays({ id: overlay.id })[0]
    if (liveOverlay) {
      const props = ('getProperties' in liveOverlay)
        ? (liveOverlay as ProOverlay).getProperties(liveOverlay.id)
        : klineStylesToOverlayProperties(liveOverlay.styles as Record<string, unknown> | undefined)
      syncOverlay(liveOverlay, props as DeepPartial<OverlayProperties>)
    }
  }

  const handleVisibilityChange = (visibility: TimeframeVisibility) => {
    if (!overlay) return
    setLocalVisibility(visibility)
    // Save to runtime store
    setOverlayTimeframeVisibility(overlay.id, visibility)
    // Persist via syncOverlay
    const chartInstance = store.instanceApi()
    if (chartInstance) {
      const liveOverlay = chartInstance.getOverlays({ id: overlay.id })[0]
      if (liveOverlay) {
        const props = ('getProperties' in liveOverlay)
          ? (liveOverlay as ProOverlay).getProperties(liveOverlay.id)
          : klineStylesToOverlayProperties(liveOverlay.styles as Record<string, unknown> | undefined)
        syncOverlay(liveOverlay, props as DeepPartial<OverlayProperties>)
      }
    }
    // Apply immediately: check current period and toggle overlay visibility
    const currentPeriod = store.period()
    if (currentPeriod) {
      const shouldBeVisible = isOverlayVisibleForPeriod(visibility, currentPeriod)
      store.instanceApi()?.overrideOverlay({ id: overlay.id, visible: shouldBeVisible })
    }
  }

  const handleExtendChange = (field: 'extendLeft' | 'extendRight', checked: boolean) => {
    const updated = { ...localExtend, [field]: checked }
    setLocalExtend(updated)
    // Apply visually by setting extendData on the overlay
    const chartInstance = store.instanceApi()
    if (chartInstance) {
      chartInstance.overrideOverlay({ id: overlay.id, extendData: updated })
      // Persist: re-read live overlay and sync
      const liveOverlay = chartInstance.getOverlays({ id: overlay.id })[0]
      if (liveOverlay) {
        const props = ('getProperties' in liveOverlay)
          ? (liveOverlay as ProOverlay).getProperties(liveOverlay.id)
          : klineStylesToOverlayProperties(liveOverlay.styles as Record<string, unknown> | undefined)
        syncOverlay(liveOverlay, props as DeepPartial<OverlayProperties>)
      }
    }
  }

  const handleApplyAsDefault = () => {
    setDefaultForOverlay(overlayName, localProps as DeepPartial<OverlayProperties>)
  }

  const handleClose = () => {
    setShowOverlaySetting(false)
  }

  return (
    <Modal
      title={getOverlayType()}
      width={480}
      onClose={handleClose}
      buttons={[
        { children: 'Apply as Default', type: 'cancel', onClick: handleApplyAsDefault },
        { children: 'Close', type: 'confirm', onClick: handleClose },
      ]}
    >
      <div className="superchart-overlay-setting-modal-content">
        {/* Tab bar */}
        <div className="tab-bar">
          {(['style', 'coordinates', 'visibility'] as SettingsTab[]).map(tab => (
            <button
              key={tab}
              className={`tab-item ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Style tab */}
        {activeTab === 'style' && (
          <div className="content">
            {schema.sections.map(section => (
              <div key={section.title} className="section">
                <div className="section-title">{section.title}</div>
                {section.fields.map(field => {
                  const value = localProps[field.key]
                  return (
                    <div key={field.key} className="component">
                      <span>{field.label}</span>
                      <FieldEditor
                        field={field}
                        value={value}
                        onChange={(v) => handleFieldChange(field, v)}
                      />
                    </div>
                  )
                })}
              </div>
            ))}

            {/* Structural overlays: per-figure color overrides */}
            {schema.figureFields && schema.figureFields.length > 0 && (
              <FigureFieldsSection
                figureFields={schema.figureFields}
                figureStyles={localFigureStyles}
                defaultColor={(localProps.lineColor ?? localProps.borderColor ?? '#1677FF') as string}
                onColorChange={handleFigureColorChange}
              />
            )}

            {/* Level-based overlays: configurable levels */}
            {schema.levelConfig && (
              <LevelsSection
                levels={localLevels}
                config={schema.levelConfig}
                defaultColor={(localProps.lineColor ?? localProps.borderColor ?? '#1677FF') as string}
                onToggle={handleLevelToggle}
                onColorChange={handleLevelColorChange}
                onValueChange={handleLevelValueChange}
                onAdd={handleAddLevel}
                onRemove={handleRemoveLevel}
              />
            )}

            {/* Extend left/right for supported overlays */}
            {EXTEND_CAPABLE_OVERLAYS.has(overlayName) && (
              <div className="section">
                <div className="section-title">Extend</div>
                <label className="extend-option">
                  <input
                    type="checkbox"
                    checked={localExtend.extendLeft}
                    onChange={(e) => handleExtendChange('extendLeft', e.target.checked)}
                  />
                  <span>Extend Left</span>
                </label>
                <label className="extend-option">
                  <input
                    type="checkbox"
                    checked={localExtend.extendRight}
                    onChange={(e) => handleExtendChange('extendRight', e.target.checked)}
                  />
                  <span>Extend Right</span>
                </label>
              </div>
            )}
          </div>
        )}

        {/* Coordinates tab */}
        {activeTab === 'coordinates' && (
          <CoordinatesTab
            localPoints={localPoints}
            setLocalPoints={setLocalPoints}
            onPointChange={handleCoordinateChange}
          />
        )}

        {/* Visibility tab */}
        {activeTab === 'visibility' && (
          <VisibilityTab
            visibility={localVisibility}
            onChange={handleVisibilityChange}
          />
        )}
      </div>
    </Modal>
  )
}

// ── Field Editor ──

interface FieldEditorProps {
  field: PropertyFieldSchema
  value: unknown
  onChange: (value: unknown) => void
}

function FieldEditor({ field, value, onChange }: FieldEditorProps) {
  switch (field.editor) {
    case 'color':
      return (
        <Color
          style={{ width: 120 }}
          value={(value as string) ?? '#1677FF'}
          reactiveChange={true}
          onChange={onChange}
        />
      )
    case 'number':
      return (
        <Input
          style={{ width: 120 }}
          precision={0}
          min={field.min}
          max={field.max}
          value={value !== undefined && value !== null ? Number(value) : (field.min ?? 1)}
          onChange={(v) => {
            const num = Number(v)
            if (typeof v === 'number' || (typeof v === 'string' && v !== '' && v !== '-' && !isNaN(num))) {
              onChange(num)
            }
          }}
        />
      )
    case 'select':
      return (
        <Select
          style={{ width: 120 }}
          value={String(value ?? field.options?.[0] ?? '')}
          dataSource={(field.options ?? []).map(opt => ({ key: opt, text: opt }))}
          onSelected={(item) => onChange(typeof item === 'string' ? item : (item as SelectDataSourceItem).key)}
        />
      )
    case 'dashedValue': {
      const arr = Array.isArray(value) ? value as number[] : [2, 2]
      return (
        <div style={{ display: 'flex', gap: 6, width: 120 }}>
          <Input
            style={{ width: 55 }}
            precision={1}
            min={0.5}
            max={20}
            value={arr[0] ?? 2}
            onChange={(v) => { const n = Number(v); if (!isNaN(n) && typeof v !== 'string') onChange([n, arr[1] ?? 2]) }}
          />
          <Input
            style={{ width: 55 }}
            precision={1}
            min={0.5}
            max={20}
            value={arr[1] ?? 2}
            onChange={(v) => { const n = Number(v); if (!isNaN(n) && typeof v !== 'string') onChange([arr[0] ?? 2, n]) }}
          />
        </div>
      )
    }
    case 'widthPx': {
      const current = typeof value === 'number' ? value : (field.min ?? 1)
      const options = WIDTH_PX_OPTIONS
        .filter(px => px >= (field.min ?? 1) && px <= (field.max ?? 8))
        .map(px => ({
          key: String(px),
          text: (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="40" height="14" style={{ display: 'block' }}>
                <line x1="0" y1="7" x2="40" y2="7" stroke="currentColor" strokeWidth={px} />
              </svg>
              <span>{px}px</span>
            </div>
          ),
        }))
      return (
        <Select
          style={{ width: 120 }}
          value={(
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="40" height="14" style={{ display: 'block' }}>
                <line x1="0" y1="7" x2="40" y2="7" stroke="currentColor" strokeWidth={current} />
              </svg>
              <span>{current}px</span>
            </div>
          )}
          dataSource={options}
          onSelected={(item) => onChange(Number(typeof item === 'string' ? item : (item as SelectDataSourceItem).key))}
        />
      )
    }
    case 'fontSize': {
      const current = typeof value === 'number' ? value : 12
      const options = FONT_SIZE_OPTIONS.map(sz => ({ key: String(sz), text: `${sz}px` }))
      return (
        <Select
          style={{ width: 120 }}
          value={`${current}px`}
          dataSource={options}
          onSelected={(item) => onChange(Number(typeof item === 'string' ? item : (item as SelectDataSourceItem).key))}
        />
      )
    }
    case 'text':
      return (
        <input
          type="text"
          className="superchart-overlay-text-input"
          style={{ width: 200 }}
          value={(value as string) ?? ''}
          placeholder="Enter text..."
          onChange={(e) => onChange(e.target.value)}
        />
      )
    default:
      return null
  }
}

// ── Coordinates Tab ──

interface CoordinatesTabProps {
  localPoints: Array<{ price: number; bar: number }>
  setLocalPoints: React.Dispatch<React.SetStateAction<Array<{ price: number; bar: number }>>>
  onPointChange: (pointIndex: number, field: 'value' | 'dataIndex', newValue: number) => void
}

function CoordinatesTab({ localPoints, setLocalPoints, onPointChange }: CoordinatesTabProps) {
  const chartInstance = store.instanceApi()
  const symbol = chartInstance?.getSymbol()
  const pricePrecision = symbol?.pricePrecision ?? 2

  const handlePriceChange = (index: number, v: string | number) => {
    if (typeof v === 'number') {
      setLocalPoints(prev => prev.map((p, i) => i === index ? { ...p, price: v } : p))
      onPointChange(index, 'value', v)
    }
  }

  const handleBarChange = (index: number, v: string | number) => {
    if (typeof v === 'number') {
      setLocalPoints(prev => prev.map((p, i) => i === index ? { ...p, bar: v } : p))
      onPointChange(index, 'dataIndex', v)
    }
  }

  if (localPoints.length === 0) {
    return (
      <div className="content">
        <div className="visibility-placeholder">No coordinates for this overlay</div>
      </div>
    )
  }

  return (
    <div className="content coordinates-content">
      {localPoints.map((point, index) => (
        <div key={index} className="coordinate-point">
          <div className="coordinate-label">#{index + 1} (price, bar)</div>
          <div className="coordinate-inputs">
            <Input
              style={{ width: 130 }}
              precision={pricePrecision}
              value={point.price}
              onChange={(v) => handlePriceChange(index, v)}
            />
            <Input
              style={{ width: 80 }}
              precision={0}
              min={0}
              value={point.bar}
              onChange={(v) => handleBarChange(index, v)}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Visibility Tab ──

interface VisibilityTabProps {
  visibility: TimeframeVisibility
  onChange: (visibility: TimeframeVisibility) => void
}

function VisibilityTab({ visibility, onChange }: VisibilityTabProps) {
  const handleShowOnAllChange = (checked: boolean) => {
    onChange({ ...visibility, showOnAll: checked })
  }

  const handleCategoryToggle = (category: PeriodCategory, enabled: boolean) => {
    onChange({
      ...visibility,
      rules: {
        ...visibility.rules,
        [category]: { ...visibility.rules[category], enabled },
      },
    })
  }

  const handleFromChange = (category: PeriodCategory, from: number) => {
    const rule = visibility.rules[category]
    const to = rule.to < from ? from : rule.to
    onChange({
      ...visibility,
      rules: {
        ...visibility.rules,
        [category]: { ...rule, from, to },
      },
    })
  }

  const handleToChange = (category: PeriodCategory, to: number) => {
    const rule = visibility.rules[category]
    const from = rule.from > to ? to : rule.from
    onChange({
      ...visibility,
      rules: {
        ...visibility.rules,
        [category]: { ...rule, from, to },
      },
    })
  }

  return (
    <div className="content visibility-content">
      <label className="visibility-master">
        <input
          type="checkbox"
          checked={visibility.showOnAll}
          onChange={(e) => handleShowOnAllChange(e.target.checked)}
        />
        <span>Show on All Timeframes</span>
      </label>

      <div className={`visibility-rules ${visibility.showOnAll ? 'disabled' : ''}`}>
        {PERIOD_CATEGORIES.map(category => {
          const rule = visibility.rules[category]
          const spans = TIMEFRAME_SPANS[category]
          const disabled = visibility.showOnAll
          return (
            <div key={category} className="visibility-rule">
              <label className="rule-toggle">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  disabled={disabled}
                  onChange={(e) => handleCategoryToggle(category, e.target.checked)}
                />
                <span className="rule-label">{PERIOD_CATEGORY_LABELS[category]}</span>
              </label>
              <div className="rule-range">
                <select
                  value={rule.from}
                  disabled={disabled || !rule.enabled}
                  onChange={(e) => handleFromChange(category, Number(e.target.value))}
                >
                  {spans.map(s => (
                    <option key={s} value={s}>{formatSpan(category, s)}</option>
                  ))}
                </select>
                <span className="range-separator">to</span>
                <select
                  value={rule.to}
                  disabled={disabled || !rule.enabled}
                  onChange={(e) => handleToChange(category, Number(e.target.value))}
                >
                  {spans.map(s => (
                    <option key={s} value={s}>{formatSpan(category, s)}</option>
                  ))}
                </select>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Structural: Per-figure color overrides ──

interface FigureFieldsSectionProps {
  figureFields: FigureFieldSchema[]
  figureStyles: Record<string, Record<string, unknown>>
  defaultColor: string
  onColorChange: (key: string, color: string) => void
}

function FigureFieldsSection({ figureFields, figureStyles, defaultColor, onColorChange }: FigureFieldsSectionProps) {
  return (
    <div className="section">
      <div className="section-title">Lines</div>
      {figureFields.map(field => (
        <div key={field.key} className="component">
          <span>{field.label}</span>
          <Color
            style={{ width: 120 }}
            value={(figureStyles[field.key]?.color as string) ?? defaultColor}
            reactiveChange={true}
            onChange={(c) => onColorChange(field.key, c as string)}
          />
        </div>
      ))}
    </div>
  )
}

// ── Level-based: Configurable levels ──

interface LevelsSectionProps {
  levels: FigureLevel[]
  config: LevelSchemaConfig
  defaultColor: string
  onToggle: (index: number, enabled: boolean) => void
  onColorChange: (index: number, color: string) => void
  onValueChange: (index: number, value: number) => void
  onAdd: () => void
  onRemove: (index: number) => void
}

function LevelsSection({ levels, config, defaultColor, onToggle, onColorChange, onValueChange, onAdd, onRemove }: LevelsSectionProps) {
  return (
    <div className="section">
      <div className="section-title">Levels</div>
      {levels.map((level, i) => (
        <div key={i} className="level-row">
          <input
            type="checkbox"
            checked={level.enabled ?? true}
            onChange={(e) => onToggle(i, e.target.checked)}
          />
          <Input
            style={{ width: 70 }}
            precision={3}
            min={-10}
            max={100}
            value={level.value ?? 0}
            onChange={(v) => { if (typeof v === 'number') onValueChange(i, v) }}
          />
          <span className="level-label">{((level.value ?? 0) * 100).toFixed(1)}%</span>
          <Color
            style={{ width: 50 }}
            value={level.color ?? defaultColor}
            reactiveChange={true}
            onChange={(c) => onColorChange(i, c as string)}
          />
          <button className="level-remove" onClick={() => onRemove(i)} title="Remove level">&times;</button>
        </div>
      ))}
      {levels.length < config.maxLevels && (
        <button className="level-add" onClick={onAdd}>+ Add Level</button>
      )}
    </div>
  )
}

export default OverlaySettingModal
