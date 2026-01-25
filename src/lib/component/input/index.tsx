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
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    if (precision !== undefined) {
      const decimalDigit = Math.max(0, Math.floor(precision))
      let reg: RegExp
      if (decimalDigit <= 0) {
        reg = /^[1-9]\d*$/
      } else {
        reg = new RegExp(`^\\d+\\.?\\d{0,${decimalDigit}}$`)
      }
      if (v === '' || (reg.test(v) && +v >= min && +v <= max)) {
        onChange?.(v === '' ? v : +v)
      }
    } else {
      onChange?.(v)
    }
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
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        onFocus={() => setStatus('focus')}
        onBlur={() => setStatus('normal')}
        onChange={handleChange}
        onKeyDown={onKeyDown}
      />
      {suffix && <span className="suffix">{suffix}</span>}
    </div>
  )
}

export default Input
