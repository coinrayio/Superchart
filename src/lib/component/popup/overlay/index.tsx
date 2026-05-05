/**
 * Overlay Options Popup — context menu for overlays
 * 1:1 port from coinray-chart-ui
 *
 * Appears on right-click or double-click of an overlay.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useChartStore } from '../../../store/chartStoreContext'
import { useChartState } from '../../../store/chartStateStore'
import { useDrawingTemplates } from '../../../hooks/useDrawingTemplates'
import { Popup as GenericPopup } from '../generic'
import { Icon } from '../../../widget/icons'
import type { ProOverlay, OverlayProperties } from '../../../types/overlay'
import type { DeepPartial } from 'klinecharts'

const OverlayOptionsPopup = () => {
  const store = useChartStore()
  const chartState = useChartState()
  const [hoverKey, setHoverKey] = useState<string | null>(null)
  const [hoverTop, setHoverTop] = useState(0)
  const popupRef = useRef<HTMLDivElement>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const HIDE_DELAY = 200

  const overlay = store.popupOverlay() as ProOverlay | null

  // Drawing templates (Ticket 5) — same shared hook as the floating popup
  // and overlay settings modal. The "Template" submenu lists the available
  // templates and pipes apply / save / delete through the hook.
  const templates = useDrawingTemplates(overlay, (props) => {
    if (!overlay) return
    chartState.modifyOverlayProperties(overlay.id, props as DeepPartial<OverlayProperties>)
  })

  const cancelHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  const startHideTimer = useCallback(() => {
    cancelHideTimer()
    hideTimerRef.current = setTimeout(() => {
      setHoverKey(null)
      hideTimerRef.current = null
    }, HIDE_DELAY)
  }, [cancelHideTimer])

  useEffect(() => {
    return () => cancelHideTimer()
  }, [cancelHideTimer])

  const close = useCallback(() => {
    store.closeOverlayPopup()
  }, [store])

  const onRowHover = (e: React.MouseEvent, key: string) => {
    cancelHideTimer()
    const target = e.currentTarget as HTMLElement
    const top = target.offsetTop || 0
    const center = top + (target.offsetHeight || 32) / 2 - 12
    setHoverTop(center)
    setHoverKey(key)
  }

  const onRowLeave = () => {
    startHideTimer()
  }

  const setStyle = (type: 'overlay') => {
    if (type === 'overlay')
      store.setShowOverlaySetting(true)
    close()
  }

  const sendBack = () => {
    if (!overlay) { close(); return }
    useChartState()?.modifyOverlay(overlay.id, { zLevel: +overlay.zLevel! + 1 })
    close()
  }

  const sendFront = () => {
    if (!overlay) { close(); return }
    useChartState()?.modifyOverlay(overlay.id, { zLevel: +overlay.zLevel! - 1 })
    close()
  }

  const lockUnlock = () => {
    if (!overlay) { close(); return }
    useChartState()?.modifyOverlay(overlay.id, { lock: !overlay.lock })
    close()
  }

  const hideUnhide = () => {
    if (!overlay) { close(); return }
    useChartState()?.modifyOverlay(overlay.id, { visible: overlay.visible })
    close()
  }

  // Submenu is `position: absolute` inside the popupRef wrapper (which is
  // `position: relative` below), so coords are popup-local — NOT viewport.
  const popupLeftPx = store.popupLeft() ?? 0
  const popupTopPx = store.popupTop() ?? 0
  const popupWidth = popupRef.current?.getBoundingClientRect().width ?? 220
  const subLeft = popupWidth + 8
  const subTop = hoverTop

  return (
    <GenericPopup
      open
      top={popupTopPx}
      left={popupLeftPx}
      onClose={close}
      className="overlay-options-popup"
    >
      <div ref={popupRef} style={{ display: 'flex', flexDirection: 'row', gap: '1px', position: 'relative' }}>
        <table className="overlay-menu" role="menu">
          <tbody>
            {templates.enabled && (
              <tr onMouseEnter={(e) => onRowHover(e, 'template')} onMouseLeave={onRowLeave}>
                <td className="icon-cell"></td>
                <td className="label">
                  <div className="flex-row row-content">
                    <span>Template</span>
                    <span className="inline-icon"><Icon name="arrowRight" /></span>
                  </div>
                </td>
              </tr>
            )}

            <tr onMouseEnter={(e) => onRowHover(e, 'visual')} onMouseLeave={onRowLeave} onClick={() => { close() }}>
              <td className="icon-cell"><Icon name="layerStack" /></td>
              <td className="label">
                <div className="flex-row row-content">
                  <span>Visual order</span>
                  <span className="inline-icon"><Icon name="arrowRight" /></span>
                </div>
              </td>
            </tr>

            <tr onMouseEnter={(e) => onRowHover(e, 'visibility')} onMouseLeave={onRowLeave} onClick={() => { close() }}>
              <td className="icon-cell"></td>
              <td className="label">
                <div className="flex-row row-content">
                  <span>Visibility on intervals</span>
                  <span className="inline-icon"><Icon name="arrowRight" /></span>
                </div>
              </td>
            </tr>

            <tr className="divider-after" onClick={() => { close() }}>
              <td className="icon-cell"></td>
              <td className="label">
                <div className="flex flex-row row-content">
                  <span>Object Tree…</span>
                </div>
              </td>
            </tr>

            <tr onClick={() => { close() }}>
              <td className="icon-cell"><Icon name="copy" /></td>
              <td className="label">
                <div className="flex flex-row row-content">
                  <span>Clone</span>
                  <span className="shortcut-pill blurred"><span className="key">Ctrl</span><span className="plus">+</span><span className="key">Drag</span></span>
                </div>
              </td>
            </tr>

            <tr className="divider-after" onClick={() => { close() }}>
              <td className="icon-cell"><Icon name="copy" /></td>
              <td className="label">
                <div className="flex flex-row row-content">
                  <span>Copy</span>
                  <span className="shortcut-pill blurred"><span className="key">Ctrl</span><span className="plus">+</span><span className="key">C</span></span>
                </div>
              </td>
            </tr>

            <tr onClick={lockUnlock}>
              <td className="icon-cell"><Icon name={overlay?.lock ? 'locked' : 'unlocked'} /></td>
              <td className="label">
                <span>{overlay?.lock ? 'Unlock' : 'Lock'}</span>
              </td>
            </tr>

            <tr onClick={hideUnhide}>
              <td className="icon-cell"><Icon name={overlay?.visible ? 'hide' : 'show'} /></td>
              <td className="label">
                <span>{overlay?.visible ? 'Hide' : 'Show'}</span>
              </td>
            </tr>

            <tr className="divider-after" onClick={() => { if (overlay) useChartState().popOverlay(overlay.id); close() }}>
              <td className="icon-cell"><Icon name="trash" /></td>
              <td className="label">
                <span>Remove</span>
                <span className="shortcut-pill blurred"><span className="key">Del</span></span>
              </td>
            </tr>

            <tr onClick={() => setStyle('overlay')}>
              <td className="icon-cell"><Icon name="settings" /></td>
              <td className="label">
                <span>Settings</span>
              </td>
            </tr>
          </tbody>
        </table>

        {hoverKey && overlay && (() => {
          return (
            <div
              className="submenu"
              style={{ position: 'absolute', left: `${subLeft}px`, top: `${subTop}px` }}
              onMouseEnter={cancelHideTimer}
              onMouseLeave={onRowLeave}
            >
              <ul>
                {hoverKey === 'visual' && (
                  <>
                    <li onClick={() => { useChartState()?.modifyOverlay(overlay.id, { zLevel: 99 }); close() }}>Bring to front</li>
                    <li onClick={() => { useChartState()?.modifyOverlay(overlay.id, { zLevel: -9999 }); close() }}>Send to back</li>
                    <li onClick={() => sendFront()}>Bring forward</li>
                    <li onClick={() => sendBack()}>Send backward</li>
                  </>
                )}
                {hoverKey === 'template' && (
                  <>
                    {templates.list.length === 0 && (
                      <li className="muted">(no templates yet)</li>
                    )}
                    {templates.list.map(t => (
                      <li
                        key={t.name}
                        onClick={() => { void templates.apply(t.name); close() }}
                        title={t.system ? 'System template' : 'User template'}
                      >
                        {t.name}{t.system ? ' (system)' : ''}
                      </li>
                    ))}
                    <li
                      onClick={async () => {
                        // eslint-disable-next-line no-alert
                        const name = window.prompt('Save drawing template as…', '')?.trim()
                        if (name && overlay) {
                          const props = overlay.getProperties
                            ? overlay.getProperties(overlay.id)
                            : (overlay.styles as Record<string, unknown> | undefined) ?? {}
                          await templates.save(name, props as DeepPartial<OverlayProperties>)
                        }
                        close()
                      }}
                    >
                      Save as…
                    </li>
                  </>
                )}
                {hoverKey === 'visibility' && (
                  <>
                    <li onClick={() => { close() }}>Current Interval and above</li>
                    <li onClick={() => { close() }}>Current Interval and below</li>
                    <li onClick={() => { close() }}>Current Interval only</li>
                    <li onClick={() => { close() }}>All intervals</li>
                  </>
                )}
              </ul>
            </div>
          )
        })()}
      </div>
    </GenericPopup>
  )
}

export default OverlayOptionsPopup
