/**
 * Input Component
 */

import { useState, useRef, type CSSProperties, type ReactNode, type KeyboardEvent, type ChangeEvent } from 'react'

export interface InputProps {
  className?: string
  style?: CSSProperties
  prefix?: ReactNode
  suffix?: ReactNode
  precision?: number
  min?: number
  max?: number
  placeholder?: string
  value: string | number
  disabled?: boolean
  autoFocus?: boolean
  onChange?: (value: string | number) => void
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void
}

export function Input({
  className,
  style,
  prefix,
  suffix,
  precision,
  min = Number.MIN_SAFE_INTEGER,
  max = Number.MAX_SAFE_INTEGER,
  placeholder,
  value,
  disabled,
  autoFocus,
  onChange,
  onKeyDown,
}: InputProps) {
  const [status, setStatus] = useState<'normal' | 'focus'>('normal')
  // Internal editing state: non-null while focused, holds intermediate string.
  // This decouples the displayed value from the parent prop during editing,
  // so handlers that only accept numbers (on blur) don't block typing.
  const [editValue, setEditValue] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const displayValue = editValue !== null ? editValue : value

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    if (precision !== undefined) {
      const decimalDigit = Math.max(0, Math.floor(precision))
      // Allow intermediate editing states: empty, minus sign, trailing decimal
      let reg: RegExp
      if (decimalDigit <= 0) {
        reg = min < 0 ? /^-?\d*$/ : /^\d*$/
      } else {
        reg = min < 0
          ? new RegExp(`^-?\\d*\\.?\\d{0,${decimalDigit}}$`)
          : new RegExp(`^\\d*\\.?\\d{0,${decimalDigit}}$`)
      }
      if (reg.test(v)) {
        setEditValue(v)
        onChange?.(v)
      }
    } else {
      setEditValue(v)
      onChange?.(v)
    }
  }

  const handleBlur = () => {
    setStatus('normal')
    if (precision !== undefined) {
      const val = editValue !== null ? editValue : value
      const num = Number(val)
      if (val === '' || val === '-' || isNaN(num)) {
        onChange?.(min > 0 ? min : 0)
      } else {
        const clamped = Math.min(max, Math.max(min, num))
        onChange?.(+clamped.toFixed(Math.max(0, Math.floor(precision))))
      }
    }
    setEditValue(null)
  }

  return (
    <div
      style={style}
      className={`superchart-input ${className ?? ''}`}
      data-status={status}
      onClick={() => inputRef.current?.focus()}
    >
      {prefix && <span className="prefix">{prefix}</span>}
      <input
        ref={inputRef}
        className="value"
        placeholder={placeholder}
        value={displayValue}
        disabled={disabled}
        autoFocus={autoFocus}
        onFocus={() => { setStatus('focus'); setEditValue(String(value)) }}
        onBlur={handleBlur}
        onChange={handleChange}
        onKeyDown={onKeyDown}
      />
      {suffix && <span className="suffix">{suffix}</span>}
    </div>
  )
}

export default Input
