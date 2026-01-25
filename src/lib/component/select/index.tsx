/**
 * Select Component
 */

import { useState, type CSSProperties, type ReactNode } from 'react'

export interface SelectDataSourceItem {
  key: string
  text: ReactNode
}

export interface SelectProps {
  className?: string
  style?: CSSProperties
  value?: ReactNode
  valueKey?: string
  dataSource?: SelectDataSourceItem[] | string[]
  onSelected?: (data: SelectDataSourceItem | string) => void
}

export function Select({
  className,
  style,
  value,
  valueKey = 'text',
  dataSource,
  onSelected,
}: SelectProps) {
  const [open, setOpen] = useState(false)

  const handleToggle = () => {
    setOpen((o) => !o)
  }

  const handleBlur = () => {
    setOpen(false)
  }

  const handleSelect = (data: SelectDataSourceItem | string, displayValue: ReactNode) => {
    if (value !== displayValue) {
      onSelected?.(data)
    }
    setOpen(false)
  }

  return (
    <div
      style={style}
      className={`superchart-select ${className ?? ''} ${open ? 'superchart-select-show' : ''}`}
      tabIndex={0}
      onClick={handleToggle}
      onBlur={handleBlur}
    >
      <div className="selector-container">
        <span className="value">{value}</span>
        <i className="arrow" />
      </div>
      {dataSource && dataSource.length > 0 && (
        <div className="drop-down-container">
          <ul>
            {dataSource.map((data, index) => {
              const item = data as SelectDataSourceItem
              const displayValue = typeof data === 'string' ? data : item[valueKey as keyof SelectDataSourceItem] ?? item.text
              return (
                <li
                  key={typeof data === 'string' ? data : item.key ?? index}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSelect(data, displayValue)
                  }}
                >
                  {displayValue}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

export default Select
