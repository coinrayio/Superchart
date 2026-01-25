/**
 * Settings Floating Widget
 * A draggable floating toolbar for overlay settings
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Color } from '../../component'

export interface FloatingAction {
  key: string
  title?: string
  icon?: string
  visible?: boolean | ((overlay?: unknown) => boolean)
  editor?: {
    type: 'color' | 'number' | 'select' | 'dropdown'
    value?: string | number
    options?: string[]
    min?: number
    max?: number
    step?: number
  }
  onClick?: (overlayId: string, value?: unknown) => void
}

export interface FloatingProps {
  locale?: string
  x?: number
  y?: number
  actions?: FloatingAction[]
  overlay?: { id: string; lock?: boolean; [key: string]: unknown }
  onClose?: () => void
  className?: string
}

const DragIcon = () => (
  <svg viewBox="0 0 24 24" className="icon-drag">
    <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
  </svg>
)

export function SettingFloating({
  x = 0,
  y = 0,
  actions = [],
  overlay,
  onClose,
  className,
}: FloatingProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [localPos, setLocalPos] = useState({ x, y })
  const [dragging, setDragging] = useState(false)
  const [visibleEditorKey, setVisibleEditorKey] = useState<string | null>(null)
  const dragStartRef = useRef({ mx: 0, my: 0, sx: 0, sy: 0 })

  // Close on outside click
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose?.()
      }
    }
    document.addEventListener('mousedown', handleDocumentClick)
    return () => document.removeEventListener('mousedown', handleDocumentClick)
  }, [onClose])

  // Update position from props
  useEffect(() => {
    if (typeof x === 'number' && typeof y === 'number') {
      setLocalPos({ x, y })
    }
  }, [x, y])

  // Drag handlers
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging) return
      const { mx, my, sx, sy } = dragStartRef.current
      const nxRaw = sx + (e.clientX - mx)
      const nyRaw = sy + (e.clientY - my)
      const maxX = Math.max(0, window.innerWidth - (containerRef.current?.offsetWidth ?? 220))
      const maxY = Math.max(0, window.innerHeight - (containerRef.current?.offsetHeight ?? 48))
      const nx = Math.min(Math.max(0, nxRaw), maxX)
      const ny = Math.min(Math.max(0, nyRaw), maxY)
      setLocalPos({ x: nx, y: ny })
    },
    [dragging]
  )

  const handleMouseUp = useCallback(() => {
    setDragging(false)
  }, [])

  useEffect(() => {
    if (dragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging, handleMouseMove, handleMouseUp])

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (
      target.closest('.superchart-action-btn') ||
      target.closest('.superchart-editor') ||
      target.tagName === 'INPUT' ||
      target.tagName === 'SELECT'
    ) {
      return
    }
    e.preventDefault()
    dragStartRef.current = {
      mx: e.clientX,
      my: e.clientY,
      sx: localPos.x,
      sy: localPos.y,
    }
    setDragging(true)
  }

  const runAction = (act: FloatingAction, value?: unknown) => {
    const id = overlay?.id
    if (act.onClick && id) {
      act.onClick(id, value)
    }
  }

  return (
    <div
      ref={containerRef}
      className={`superchart-setting-floating ${className ?? ''} ${dragging ? 'dragging' : ''}`}
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
      <div className="superchart-floating-inner">
        <div className="drag-handle">
          <DragIcon />
        </div>
        {actions.map((act) => {
          const isVisible =
            typeof act.visible === 'function'
              ? act.visible(overlay)
              : (act.visible ?? true)
          if (!isVisible) return null

          return (
            <div key={act.key} className="superchart-action" title={act.title ?? act.key}>
              <div
                className="superchart-action-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  if (act.editor) {
                    setVisibleEditorKey(visibleEditorKey === act.key ? null : act.key)
                  } else {
                    runAction(act)
                  }
                }}
              >
                <div
                  className="superchart-action-icon"
                  style={
                    act.editor?.type === 'color'
                      ? { height: 16, width: 16 }
                      : undefined
                  }
                >
                  {act.icon && <span>{act.icon}</span>}
                </div>
                {act.editor?.type === 'color' && (
                  <div
                    className="superchart-action-label"
                    style={{ backgroundColor: act.editor.value as string }}
                  />
                )}
              </div>

              {act.editor && visibleEditorKey === act.key && (
                <div className="superchart-editor" onClick={(e) => e.stopPropagation()}>
                  {act.editor.type === 'color' && (
                    <Color
                      style={{ width: 120 }}
                      value={act.editor.value as string}
                      reactiveChange={false}
                      onChange={(el) => runAction(act, el)}
                    />
                  )}
                  {act.editor.type === 'number' && (
                    <input
                      type="number"
                      min={act.editor.min}
                      max={act.editor.max}
                      step={act.editor.step}
                      value={String(act.editor.value ?? '')}
                      onChange={(e) => runAction(act, Number(e.target.value))}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  {act.editor.type === 'select' && (
                    <select
                      value={(act.editor.value as string) ?? ''}
                      onChange={(e) => runAction(act, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {(act.editor.options ?? []).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SettingFloating
