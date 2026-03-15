/**
 * TimeframeModal - Quick timeframe/period selection via keyboard input
 *
 * Follows the pattern from coinray-chart-ui/src/widget/timeframe-modal
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { Modal, Input } from '../../component'
import i18n from '../../i18n'
import type { Period } from '../../types/chart'

export interface TimeframeModalProps {
  /** Locale for translations */
  locale?: string
  /** Available periods */
  periods: Period[]
  /** Called when a timeframe is selected */
  onTimeframeSelected: (period: Period) => void
  /** Called when modal is closed */
  onClose: () => void
}

export function TimeframeModal({
  locale = 'en-US',
  periods,
  onTimeframeSelected,
  onClose,
}: TimeframeModalProps) {
  const [inputValue, setInputValue] = useState('')
  const [matchedPeriod, setMatchedPeriod] = useState<Period | null>(null)
  const [hasError, setHasError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const findMatchingPeriod = useCallback((value: string): Period | null => {
    if (!value) return null

    // Try to find matching period
    const period = periods.find((per) => {
      // Match format like "1m", "5m", "1h", "4h", "1d", "1w"
      const text = per.text.toLowerCase()
      const input = value.toLowerCase()

      // Direct match (e.g., "1m" matches "1m")
      if (input === text || input === text.replace(' ', '')) {
        return true
      }

      // Match number only (assume minutes)
      if (/^\d+$/.test(input)) {
        const span = parseInt(input, 10)
        if (per.span === span && per.type === 'minute') {
          return true
        }
      }

      // Match number + first letter of unit
      const match = input.match(/^(\d+)([a-z])$/i)
      if (match) {
        const span = parseInt(match[1], 10)
        const unit = match[2].toLowerCase()

        if (per.span === span) {
          // Map unit letters to period types
          const unitMap: Record<string, string> = {
            's': 'second',
            'm': 'minute',
            'h': 'hour',
            'd': 'day',
            'w': 'week',
            'M': 'month',
          }
          if (unitMap[unit] === per.type) {
            return true
          }
        }
      }

      return false
    })

    return period ?? null
  }, [periods])

  const handleInputChange = useCallback((value: string | number) => {
    const strValue = String(value)
    setInputValue(strValue)
    const period = findMatchingPeriod(strValue)
    setMatchedPeriod(period)
    setHasError(strValue.length > 0 && !period)
  }, [findMatchingPeriod])

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      if (matchedPeriod) {
        onTimeframeSelected(matchedPeriod)
      }
      onClose()
    } else if (event.key === 'Escape') {
      onClose()
    }
  }, [matchedPeriod, onTimeframeSelected, onClose])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <Modal
      title={i18n('period_change', locale)}
      width={460}
      onClose={onClose}
    >
      <div className={`superchart-timeframe-modal-input ${hasError ? 'input-error' : ''}`}>
        <Input
          placeholder={i18n('period_code', locale)}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          suffix={
            <svg viewBox="0 0 1024 1024">
              <path d="M945.066667 898.133333l-189.866667-189.866666c55.466667-64 87.466667-149.333333 87.466667-241.066667 0-204.8-168.533333-373.333333-373.333334-373.333333S96 264.533333 96 469.333333 264.533333 842.666667 469.333333 842.666667c91.733333 0 174.933333-34.133333 241.066667-87.466667l189.866667 189.866667c6.4 6.4 14.933333 8.533333 23.466666 8.533333s17.066667-2.133333 23.466667-8.533333c8.533333-12.8 8.533333-34.133333-2.133333-46.933334zM469.333333 778.666667C298.666667 778.666667 160 640 160 469.333333S298.666667 160 469.333333 160 778.666667 298.666667 778.666667 469.333333 640 778.666667 469.333333 778.666667z"/>
            </svg>
          }
        />
      </div>
      {matchedPeriod && (
        <div className="superchart-timeframe-modal-match">
          <span className="superchart-timeframe-modal-match-label">
            {i18n('matched_period', locale)}:
          </span>
          <span className="superchart-timeframe-modal-match-value">
            {matchedPeriod.text}
          </span>
        </div>
      )}
      <div className="superchart-timeframe-modal-hint">
        <span>{i18n('timeframe_hint', locale)}</span>
        <div className="superchart-timeframe-modal-examples">
          {periods.slice(0, 6).map((period) => (
            <span
              key={`${period.span}-${period.type}`}
              className="superchart-timeframe-modal-example"
              onClick={() => {
                onTimeframeSelected(period)
                onClose()
              }}
            >
              {period.text}
            </span>
          ))}
        </div>
      </div>
    </Modal>
  )
}

export default TimeframeModal
