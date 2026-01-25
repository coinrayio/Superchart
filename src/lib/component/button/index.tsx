/**
 * Button Component
 */

import type { CSSProperties, ReactNode, MouseEvent } from 'react'

export type ButtonType = 'confirm' | 'cancel'

export interface ButtonProps {
  className?: string
  style?: CSSProperties
  type?: ButtonType
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void
  children?: ReactNode
}

export function Button({ className, style, type = 'confirm', onClick, children }: ButtonProps) {
  return (
    <button
      style={style}
      className={`superchart-button ${type} ${className ?? ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export default Button
