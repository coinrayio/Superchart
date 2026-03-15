/**
 * Checkbox Component
 */

import { useState, useEffect, type CSSProperties, type ReactNode } from 'react'

const CheckedIcon = () => (
  <svg viewBox="0 0 1024 1024" className="icon">
    <path d="M810.666667 128H213.333333c-46.933333 0-85.333333 38.4-85.333333 85.333333v597.333334c0 46.933333 38.4 85.333333 85.333333 85.333333h597.333334c46.933333 0 85.333333-38.4 85.333333-85.333333V213.333333c0-46.933333-38.4-85.333333-85.333333-85.333333z m-353.706667 567.04a42.496 42.496 0 0 1-60.16 0L243.626667 541.866667c-8.106667-8.106667-12.373333-18.773333-12.373334-29.866667s4.693333-22.186667 12.373334-29.866667a42.496 42.496 0 0 1 60.16 0L426.666667 604.586667l293.546666-293.546667a42.496 42.496 0 1 1 60.16 60.16l-323.413333 323.84z" />
  </svg>
)

const NormalIcon = () => (
  <svg viewBox="0 0 1024 1024" className="icon">
    <path d="M245.333333 128h533.333334A117.333333 117.333333 0 0 1 896 245.333333v533.333334A117.333333 117.333333 0 0 1 778.666667 896H245.333333A117.333333 117.333333 0 0 1 128 778.666667V245.333333A117.333333 117.333333 0 0 1 245.333333 128z m0 64c-29.44 0-53.333333 23.893333-53.333333 53.333333v533.333334c0 29.44 23.893333 53.333333 53.333333 53.333333h533.333334c29.44 0 53.333333-23.893333 53.333333-53.333333V245.333333c0-29.44-23.893333-53.333333-53.333333-53.333333H245.333333z" />
  </svg>
)

export interface CheckboxProps {
  className?: string
  style?: CSSProperties
  checked?: boolean
  label?: ReactNode
  onChange?: (checked: boolean) => void
}

export function Checkbox({ className, style, checked, label, onChange }: CheckboxProps) {
  const [innerChecked, setInnerChecked] = useState(checked ?? false)

  useEffect(() => {
    if (checked !== undefined) {
      setInnerChecked(checked)
    }
  }, [checked])

  const handleClick = () => {
    const newChecked = !innerChecked
    onChange?.(newChecked)
    setInnerChecked(newChecked)
  }

  return (
    <div
      style={style}
      className={`superchart-checkbox ${innerChecked ? 'checked' : ''} ${className ?? ''}`}
      onClick={handleClick}
    >
      {innerChecked ? <CheckedIcon /> : <NormalIcon />}
      {label && <span className="label">{label}</span>}
    </div>
  )
}

export default Checkbox
