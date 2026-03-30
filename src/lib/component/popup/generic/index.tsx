/**
 * Generic Popup Component
 */

import { useCallback, type CSSProperties, type ReactNode, type MouseEvent } from 'react'

export interface PopupProps {
  open?: boolean
  top?: number
  left?: number
  onClose?: () => void
  onMouseEnter?: (e?: MouseEvent) => void
  onMouseLeave?: (e?: MouseEvent) => void
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

const MARGIN = 8

export function Popup({
  open,
  top,
  left,
  onClose,
  onMouseEnter,
  onMouseLeave,
  className,
  style,
  children,
}: PopupProps) {
  if (!open) return null

  const vpW = typeof window !== 'undefined' ? window.innerWidth : 1024
  const vpH = typeof window !== 'undefined' ? window.innerHeight : 768

  const styleObj: CSSProperties = {
    ...(style ?? {}),
    position: 'absolute',
  }

  if (typeof top === 'number') {
    styleObj.top = `${top}px`
  } else {
    styleObj.maxHeight = '50%'
    styleObj.top = '50%'
    styleObj.transform = 'translateY(-50%)'
  }

  if (typeof left === 'number') {
    styleObj.left = `${left}px`
    if (typeof top === 'number') styleObj.transform = undefined
  } else {
    styleObj.maxWidth = '50%'
    styleObj.left = '50%'
    styleObj.transform = styleObj.transform
      ? `${styleObj.transform} translateX(-50%)`
      : 'translateX(-50%)'
  }

  // After mount, measure the popup and shift it so it stays within the viewport
  const popupRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    const rect = node.getBoundingClientRect()
    // Vertical: shift up if overflowing bottom, down if above top
    if (typeof top === 'number') {
      const overflowBottom = rect.bottom - (vpH - MARGIN)
      if (overflowBottom > 0) {
        node.style.top = `${Math.max(MARGIN, top - overflowBottom)}px`
      } else if (rect.top < MARGIN) {
        node.style.top = `${MARGIN}px`
      }
    }
    // Horizontal: shift left if overflowing right, right if past left edge
    if (typeof left === 'number') {
      const overflowRight = rect.right - (vpW - MARGIN)
      if (overflowRight > 0) {
        node.style.left = `${Math.max(MARGIN, left - overflowRight)}px`
      } else if (rect.left < MARGIN) {
        node.style.left = `${MARGIN}px`
      }
    }
  }, [top, left, vpH, vpW])

  return (
    <div
      className="superchart-popup_background"
      onClick={() => onClose?.()}
      onMouseOver={(e) => onMouseEnter?.(e)}
      onMouseLeave={(e) => onMouseLeave?.(e)}
    >
      <div
        ref={popupRef}
        className={`popup ${className ?? ''}`}
        style={styleObj}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

export default Popup
