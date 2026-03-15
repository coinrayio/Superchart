/**
 * Generic Popup Component
 */

import { type CSSProperties, type ReactNode, type MouseEvent } from 'react'

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

function getScreenSize() {
  return {
    x: typeof window !== 'undefined' ? window.innerWidth : 1024,
    y: typeof window !== 'undefined' ? window.innerHeight : 768,
  }
}

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

  const MARGIN = 8
  const vpW = typeof window !== 'undefined' ? window.innerWidth : 1024
  const vpH = typeof window !== 'undefined' ? window.innerHeight : 768

  const styleObj: CSSProperties = {
    ...(style ?? {}),
    position: 'absolute',
    overflow: 'auto',
  }

  if (typeof top === 'number') {
    styleObj.maxHeight = `${getScreenSize().y - top - MARGIN}px`
    const topPx = Math.max(MARGIN, Math.min(top, vpH - MARGIN - 40))
    styleObj.top = `${topPx}px`
  } else {
    styleObj.maxHeight = '50%'
    styleObj.top = '50%'
    styleObj.transform = 'translateY(-50%)'
  }

  if (typeof left === 'number') {
    styleObj.maxWidth = `${left - MARGIN}px`
    const leftPx = Math.max(MARGIN, Math.min(left, vpW - MARGIN - 40))
    styleObj.left = `${leftPx}px`
    if (typeof top === 'number') styleObj.transform = undefined
  } else {
    styleObj.maxWidth = '50%'
    styleObj.left = '50%'
    styleObj.transform = styleObj.transform
      ? `${styleObj.transform} translateX(-50%)`
      : 'translateX(-50%)'
  }

  return (
    <div
      className="superchart-popup_background"
      onClick={() => onClose?.()}
      onMouseOver={(e) => onMouseEnter?.(e)}
      onMouseLeave={(e) => onMouseLeave?.(e)}
    >
      <div
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
