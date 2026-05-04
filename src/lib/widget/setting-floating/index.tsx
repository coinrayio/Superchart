/**
 * Settings Floating Widget
 * A draggable floating toolbar for overlay settings.
 *
 * Reads selectedOverlay from chartStore directly.
 * Uses getStrokeKeys() to map actions to the correct properties per overlay type:
 *   - Lines use lineColor/lineWidth/lineStyle
 *   - Shapes use borderColor/borderWidth/borderStyle
 */

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react'
import { Color } from '../../component'
import DragIcon from '../icons/drag'
import { Icon } from '../icons'
import { useChartStore } from '../../store/chartStoreContext'
import { useChartState } from '../../hooks/useChartState'
import { useDrawingTemplates } from '../../hooks/useDrawingTemplates'
import type { ProOverlay, OverlayProperties } from '../../types/overlay'
import type { DeepPartial } from 'klinecharts'
import {
  schemaHasField,
  klineStylesToOverlayProperties,
  getStrokeKeys,
  getLineStylePreset,
  LINE_STYLE_PRESETS,
  WIDTH_PX_OPTIONS,
  type LineStylePreset,
} from '../overlay/overlayPropertySchemas'

export interface FloatingProps {
  locale?: string
  onClose?: () => void
  className?: string
}

function useStoreValue<T>(
  getValue: () => T,
  subscribe: (listener: (value: T) => void) => () => void
): T {
  return useSyncExternalStore(subscribe, getValue, getValue)
}

// Inline SVG for the toolbar button — shows the current line thickness
function WidthIcon({ px }: { px: number }) {
  const h = Math.max(1, px)
  const y = (28 - h) / 2
  return (
    <svg viewBox="0 0 28 28" width="28" height="28" fill="currentColor">
      <rect x="4" y={y} width="20" height={h} rx={Math.min(h / 2, 1)} />
    </svg>
  )
}

const STYLE_OPTIONS: { key: LineStylePreset; icon: string }[] = [
  { key: 'solid', icon: 'line' },
  { key: 'dashed', icon: 'lineDashed' },
  { key: 'dotted', icon: 'lineDotted' },
]

export function SettingFloating({ onClose, className }: FloatingProps) {
  const store = useChartStore()
  const overlay = useStoreValue(store.selectedOverlay, store.subscribeSelectedOverlay) as ProOverlay | null

  const { popOverlay, modifyOverlay, modifyOverlayProperties } = useChartState()

  const containerRef = useRef<HTMLDivElement>(null)
  // Position is in the chart container's coordinate space (position: absolute
  // relative to the nearest positioned ancestor — .superchart, which is
  // position: relative). Each Superchart instance has its own container, so
  // popups from different instances can't overlap or drag into each other.
  const [localPos, setLocalPos] = useState<{ x: number; y: number }>(() => ({ x: 0, y: 40 }))
  const [dragging, setDragging] = useState(false)
  const [visibleEditorKey, setVisibleEditorKey] = useState<string | null>(null)
  const dragStartRef = useRef({ mx: 0, my: 0, sx: 0, sy: 0 })

  // Returns the nearest positioned ancestor — the chart container — which
  // anchors the popup's absolute positioning and bounds its drag movement.
  const getChartContainer = useCallback((): HTMLElement | null => {
    const el = containerRef.current
    if (!el) return null
    return (el.offsetParent as HTMLElement) ?? el.parentElement
  }, [])

  // Center horizontally within the chart container on first mount (the chart
  // container's width isn't known at useState-initializer time, so we defer).
  useEffect(() => {
    const parent = getChartContainer()
    if (!parent) return
    const el = containerRef.current
    const popupW = el?.offsetWidth ?? 220
    const centerX = Math.max(0, (parent.offsetWidth - popupW) / 2)
    setLocalPos({ x: centerX, y: 40 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay?.id])

  // Local snapshot of overlay properties — ensures icons update immediately
  const [localProps, setLocalProps] = useState<Record<string, unknown>>({})

  // Sync local props when overlay changes or is selected
  useEffect(() => {
    if (!overlay) return
    const props = overlay.getProperties
      ? overlay.getProperties(overlay.id)
      : klineStylesToOverlayProperties(overlay.styles as Record<string, unknown> | undefined)
    setLocalProps(props as Record<string, unknown>)
  }, [overlay?.id])

  // Close on outside click — but treat portaled descendants (the color picker
  // dropdown and its backdrop) as "inside" so interacting with the color
  // picker doesn't dismiss the floating settings.
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      // Color picker is portaled out of our ref — don't treat it as outside
      if (
        target.closest('.superchart-color-backdrop') ||
        target.closest('.drop-down-container')
      ) return
      if (containerRef.current && !containerRef.current.contains(target)) {
        setVisibleEditorKey(null)
        onClose?.()
      }
    }
    document.addEventListener('mousedown', handleDocumentClick)
    return () => document.removeEventListener('mousedown', handleDocumentClick)
  }, [onClose])

  // Drag handlers — bounds are the chart container, not the window, so the
  // popup cannot escape the Superchart instance it belongs to.
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const { mx, my, sx, sy } = dragStartRef.current
    const nxRaw = sx + (e.clientX - mx)
    const nyRaw = sy + (e.clientY - my)
    const parent = getChartContainer()
    const parentW = parent?.offsetWidth ?? window.innerWidth
    const parentH = parent?.offsetHeight ?? window.innerHeight
    const maxX = Math.max(0, parentW - (containerRef.current?.offsetWidth ?? 220))
    const maxY = Math.max(0, parentH - (containerRef.current?.offsetHeight ?? 48))
    setLocalPos({
      x: Math.min(Math.max(0, nxRaw), maxX),
      y: Math.min(Math.max(0, nyRaw), maxY),
    })
  }, [getChartContainer])

  const handleMouseUp = useCallback(() => {
    setDragging(false)
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseMove])

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('.cr-action-btn') || target.closest('.cr-editor') ||
        target.tagName === 'INPUT' || target.tagName === 'SELECT') return
    e.preventDefault()
    dragStartRef.current = { mx: e.clientX, my: e.clientY, sx: localPos.x, sy: localPos.y }
    setDragging(true)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // Helper: apply properties and update local state immediately
  const applyProps = (props: DeepPartial<OverlayProperties>) => {
    if (!overlay) return
    setLocalProps(prev => ({ ...prev, ...props }))
    modifyOverlayProperties(overlay.id, props)
  }

  // ---- Drawing templates (Ticket 5) ----
  // The hook owns the feature-flag + adapter-capability gate; we just render
  // the controls when `templates.enabled` is true.
  const templates = useDrawingTemplates(overlay, applyProps)
  const [showTemplatesEditor, setShowTemplatesEditor] = useState(false)

  const handleApplyTemplate = async (name: string) => {
    await templates.apply(name)
    setShowTemplatesEditor(false)
  }

  const handleSaveAsTemplate = async () => {
    if (!overlay) return
    // eslint-disable-next-line no-alert
    const name = window.prompt('Save drawing template as…', '')?.trim()
    if (!name) return
    await templates.save(name, { ...localProps } as DeepPartial<OverlayProperties>)
  }

  if (!overlay) return null

  const name = overlay.name ?? ''
  const stroke = getStrokeKeys(name)
  const hasBackground = schemaHasField(name, 'backgroundColor')
  const hasText = schemaHasField(name, 'textColor')
  const hasStroke = schemaHasField(name, stroke.colorKey)

  const strokeColor = (localProps[stroke.colorKey] as string) ?? '#1677FF'
  const strokeWidth = (localProps[stroke.widthKey] as number) ?? 1
  const strokeStyle = (localProps[stroke.styleKey] as string) ?? 'solid'
  const dashedValue = localProps.lineDashedValue as number[] | undefined
  const currentPreset = getLineStylePreset(strokeStyle, dashedValue)

  return (
    <div
      ref={containerRef}
      className={`cr-setting-floating ${className ?? ''} ${dragging ? 'dragging' : ''}`}
      style={{
        position: 'absolute',
        left: `${localPos.x}px`,
        top: `${localPos.y}px`,
        touchAction: 'none',
        cursor: dragging ? 'grabbing' : 'grab',
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={handleMouseDown}
    >
      <div className="cr-floating-inner">
        <div className="drag-handle"><DragIcon /></div>

        {/* Stroke color */}
        {hasStroke && (
          <div className="cr-action" title="Stroke color">
            <div
              className="cr-action-btn"
              onClick={(e) => { e.stopPropagation(); setVisibleEditorKey(visibleEditorKey === 'stroke' ? null : 'stroke') }}
            >
              <div className="cr-action-icon" style={{ height: 16, width: 16 }}>
                <Icon name="edit" />
              </div>
              <div className="cr-action-label" style={{ backgroundColor: strokeColor }} />
            </div>
            {visibleEditorKey === 'stroke' && (
              <div className="cr-editor cr-color-editor" onClick={(e) => e.stopPropagation()}>
                <Color
                  value={strokeColor}
                  reactiveChange={true}
                  defaultOpen={true}
                  onChange={(color) => applyProps({ [stroke.colorKey]: color } as any)}
                  onClose={() => setVisibleEditorKey(null)}
                />
              </div>
            )}
          </div>
        )}

        {/* Background / fill color */}
        {hasBackground && (
          <div className="cr-action" title="Fill color">
            <div
              className="cr-action-btn"
              onClick={(e) => { e.stopPropagation(); setVisibleEditorKey(visibleEditorKey === 'fill' ? null : 'fill') }}
            >
              <div className="cr-action-icon" style={{ height: 16, width: 16 }}>
                <Icon name="fill" />
              </div>
              <div
                className="cr-action-label"
                style={{ backgroundColor: (localProps.backgroundColor as string) ?? 'rgba(22, 119, 255, 0.25)' }}
              />
            </div>
            {visibleEditorKey === 'fill' && (
              <div className="cr-editor cr-color-editor" onClick={(e) => e.stopPropagation()}>
                <Color
                  value={(localProps.backgroundColor as string) ?? 'rgba(22, 119, 255, 0.25)'}
                  reactiveChange={true}
                  defaultOpen={true}
                  onChange={(color) => applyProps({ backgroundColor: color })}
                  onClose={() => setVisibleEditorKey(null)}
                />
              </div>
            )}
          </div>
        )}

        {/* Text color */}
        {hasText && (
          <div className="cr-action" title="Text color">
            <div
              className="cr-action-btn"
              onClick={(e) => { e.stopPropagation(); setVisibleEditorKey(visibleEditorKey === 'text' ? null : 'text') }}
            >
              <div className="cr-action-icon" style={{ height: 16, width: 16 }}>
                <Icon name="text" />
              </div>
              <div
                className="cr-action-label"
                style={{ backgroundColor: (localProps.textColor as string) ?? '#ffffff' }}
              />
            </div>
            {visibleEditorKey === 'text' && (
              <div className="cr-editor cr-color-editor" onClick={(e) => e.stopPropagation()}>
                <Color
                  value={(localProps.textColor as string) ?? '#ffffff'}
                  reactiveChange={true}
                  defaultOpen={true}
                  onChange={(color) => applyProps({ textColor: color })}
                  onClose={() => setVisibleEditorKey(null)}
                />
              </div>
            )}
          </div>
        )}

        {/* Stroke width — line-preview dropdown */}
        {hasStroke && (
          <div className="cr-action" title="Line width">
            <div
              className="cr-action-btn"
              onClick={(e) => { e.stopPropagation(); setVisibleEditorKey(visibleEditorKey === 'width' ? null : 'width') }}
            >
              <div className="cr-action-icon"><WidthIcon px={strokeWidth} /></div>
            </div>
            {visibleEditorKey === 'width' && (
              <div className="cr-editor cr-width-editor" onClick={(e) => e.stopPropagation()}>
                {WIDTH_PX_OPTIONS.map((px: number) => (
                  <div
                    key={px}
                    className={`cr-width-option ${strokeWidth === px ? 'active' : ''}`}
                    title={`${px}px`}
                    onClick={() => {
                      applyProps({ [stroke.widthKey]: px } as any)
                      setVisibleEditorKey(null)
                    }}
                  >
                    <svg width="40" height="14" style={{ flexShrink: 0 }}>
                      <line x1="0" y1="7" x2="40" y2="7" stroke="currentColor" strokeWidth={px} />
                    </svg>
                    <span className="cr-width-label">{px}px</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Line style — solid / dashed / dotted */}
        {hasStroke && (
          <div className="cr-action" title="Line style">
            <div
              className="cr-action-btn"
              onClick={(e) => { e.stopPropagation(); setVisibleEditorKey(visibleEditorKey === 'style' ? null : 'style') }}
            >
              <div className="cr-action-icon">
                <Icon name={STYLE_OPTIONS.find(s => s.key === currentPreset)?.icon ?? 'line'} />
              </div>
            </div>
            {visibleEditorKey === 'style' && (
              <div className="cr-editor cr-line-style-editor" onClick={(e) => e.stopPropagation()}>
                {STYLE_OPTIONS.map(opt => (
                  <div
                    key={opt.key}
                    className={`cr-line-style-option ${currentPreset === opt.key ? 'active' : ''}`}
                    title={opt.key}
                    onClick={() => {
                      const preset = LINE_STYLE_PRESETS[opt.key]
                      applyProps({
                        [stroke.styleKey]: preset.style,
                        lineDashedValue: preset.dashedValue,
                      } as any)
                      setVisibleEditorKey(null)
                    }}
                  >
                    <Icon name={opt.icon} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings */}
        <div className="cr-action" title="Settings">
          <div className="cr-action-btn" onClick={(e) => { e.stopPropagation(); store.setPopupOverlay(overlay); store.setShowOverlaySetting(true) }}>
            <div className="cr-action-icon"><Icon name="settings" /></div>
          </div>
        </div>

        {/* Drawing-template controls (Ticket 5) — visible when the
            drawing_templates flag is on AND the active adapter implements
            the four template methods. */}
        {templates.enabled && (
          <div className="cr-action" title="Drawing templates">
            <div
              className="cr-action-btn"
              onClick={(e) => {
                e.stopPropagation()
                setShowTemplatesEditor(prev => !prev)
                setVisibleEditorKey(null)
              }}
            >
              <div className="cr-action-icon"><Icon name="templates" /></div>
            </div>
            {showTemplatesEditor && (
              <div
                className="cr-editor"
                onClick={(e) => e.stopPropagation()}
                style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 6, minWidth: 200 }}
              >
                <div style={{ fontSize: 11, color: '#888' }}>Templates for {overlay.name}</div>
                {templates.list.length === 0 && (
                  <div style={{ fontSize: 11, color: '#888' }}>(no templates yet)</div>
                )}
                {templates.list.map(t => (
                  <div key={t.name} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => { void handleApplyTemplate(t.name) }}
                      title={t.system ? 'System template' : 'User template'}
                      style={{
                        flex: 1, padding: '3px 6px', fontSize: 11,
                        cursor: 'pointer', textAlign: 'left',
                        background: 'transparent', color: '#fff',
                        border: '1px solid #555', borderRadius: 3,
                      }}
                    >
                      {t.name}{t.system ? ' (system)' : ''}
                    </button>
                    <button
                      type="button"
                      disabled={!!t.system}
                      title={t.system ? 'System templates cannot be deleted' : 'Delete'}
                      onClick={() => { void templates.remove(t.name) }}
                      style={{
                        padding: '3px 6px', fontSize: 11,
                        cursor: t.system ? 'not-allowed' : 'pointer',
                        background: 'transparent', color: '#aaa',
                        border: '1px solid #555', borderRadius: 3,
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => { void handleSaveAsTemplate() }}
                  style={{
                    padding: '4px 8px', fontSize: 11, cursor: 'pointer',
                    background: '#2a2a3a', color: '#fff',
                    border: '1px solid #555', borderRadius: 3, marginTop: 4,
                  }}
                >
                  Save as…
                </button>
                {templates.error && (
                  <span style={{ color: '#f88', fontSize: 11 }}>{templates.error}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Lock/Unlock */}
        <div className="cr-action" title={overlay.lock ? 'Unlock' : 'Lock'}>
          <div className="cr-action-btn" onClick={(e) => { e.stopPropagation(); modifyOverlay(overlay.id, { lock: !overlay.lock }) }}>
            <div className="cr-action-icon"><Icon name={overlay.lock ? 'locked' : 'unlocked'} /></div>
          </div>
        </div>

        {/* Delete */}
        <div className="cr-action" title="Delete">
          <div className="cr-action-btn" onClick={(e) => { e.stopPropagation(); popOverlay(overlay.id) }}>
            <div className="cr-action-icon"><Icon name="trash" /></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingFloating
