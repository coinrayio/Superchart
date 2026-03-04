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
import * as store from '../../store/chartStore'
import { useChartState } from '../../hooks/useChartState'
import { setPopupOverlay, setShowOverlaySetting } from '../../store/overlaySettingStore'
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
  const overlay = useStoreValue(store.selectedOverlay, store.subscribeSelectedOverlay) as ProOverlay | null

  const { popOverlay, modifyOverlay, modifyOverlayProperties } = useChartState()

  const containerRef = useRef<HTMLDivElement>(null)
  const [localPos, setLocalPos] = useState(() => ({
    x: Math.max(500, window.innerWidth / 2),
    y: 40,
  }))
  const [dragging, setDragging] = useState(false)
  const [visibleEditorKey, setVisibleEditorKey] = useState<string | null>(null)
  const dragStartRef = useRef({ mx: 0, my: 0, sx: 0, sy: 0 })

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

  // Close on outside click
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setVisibleEditorKey(null)
        onClose?.()
      }
    }
    document.addEventListener('mousedown', handleDocumentClick)
    return () => document.removeEventListener('mousedown', handleDocumentClick)
  }, [onClose])

  // Drag handlers
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const { mx, my, sx, sy } = dragStartRef.current
    const nxRaw = sx + (e.clientX - mx)
    const nyRaw = sy + (e.clientY - my)
    const maxX = Math.max(0, window.innerWidth - (containerRef.current?.offsetWidth ?? 220))
    const maxY = Math.max(0, window.innerHeight - (containerRef.current?.offsetHeight ?? 48))
    setLocalPos({
      x: Math.min(Math.max(0, nxRaw), maxX),
      y: Math.min(Math.max(0, nyRaw), maxY),
    })
  }, [])

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
        position: 'fixed',
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
          <div className="cr-action-btn" onClick={(e) => { e.stopPropagation(); setPopupOverlay(overlay); setShowOverlaySetting(true) }}>
            <div className="cr-action-icon"><Icon name="settings" /></div>
          </div>
        </div>

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
