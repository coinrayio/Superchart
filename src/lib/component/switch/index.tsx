/**
 * Switch Component
 */

import { type CSSProperties } from 'react'

export interface SwitchProps {
  className?: string
  style?: CSSProperties
  open: boolean
  onChange: () => void
}

export function Switch({ className, style, open, onChange }: SwitchProps) {
  return (
    <div
      style={style}
      className={`superchart-switch ${open ? 'turn-on' : 'turn-off'} ${className ?? ''}`}
      onClick={() => {
        onChange?.()
      }}
    >
      <i className="thumb" />
    </div>
  )
}

export default Switch
