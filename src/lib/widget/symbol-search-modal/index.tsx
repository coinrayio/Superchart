/**
 * Symbol Search Modal Widget
 *
 * TradingView-style symbol search with symbol type tabs,
 * exchange filter, keyboard navigation, and highlighted matching text.
 */

import { useState, useEffect, useCallback, useRef, useMemo, type KeyboardEvent } from 'react'
import i18n from '../../i18n'

export interface SymbolInfo {
  ticker: string
  name?: string
  shortName?: string
  logo?: string
  exchange?: string
  exchangeLogo?: string
  type?: string
  pricePrecision?: number
  volumePrecision?: number
}

export interface SymbolSearchDatafeed {
  searchSymbols: (query: string, exchange: string, symbolType: string) => Promise<SymbolInfo[]>
}

export interface SymbolTypeFilter {
  name: string
  value: string
}

export interface ExchangeFilter {
  value: string
  name: string
  desc?: string
}

export interface SymbolSearchModalProps {
  locale: string
  datafeed: SymbolSearchDatafeed
  symbolsTypes?: SymbolTypeFilter[]
  exchanges?: ExchangeFilter[]
  onSymbolSelected: (symbol: SymbolInfo) => void
  onClose: () => void
}

function highlightMatch(text: string, query: string) {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx < 0) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export function SymbolSearchModal({
  locale,
  datafeed,
  symbolsTypes,
  exchanges: _exchanges,
  onSymbolSelected,
  onClose,
}: SymbolSearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SymbolInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [selectedType, setSelectedType] = useState('')
  const selectedExchange = ''
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const searchSymbols = useCallback(
    async (q: string, exchange: string, symbolType: string) => {
      setLoading(true)
      try {
        const res = await datafeed.searchSymbols(q, exchange, symbolType)
        setResults(res)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    },
    [datafeed]
  )

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchSymbols(query, selectedExchange, selectedType)
      setActiveIndex(0)
    }, 250)
    return () => clearTimeout(timeoutId)
  }, [query, selectedExchange, selectedType, searchSymbols])

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault()
      onSymbolSelected(results[activeIndex])
      onClose()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  // Scroll active item into view
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const active = list.querySelector('[data-active="true"]') as HTMLElement | null
    active?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('superchart-symbol-search-overlay')) {
      onClose()
    }
  }

  // Build symbol type tabs
  const typeTabs = useMemo(() => {
    if (!symbolsTypes || symbolsTypes.length === 0) return null
    const hasAll = symbolsTypes.some(t => t.value === '')
    if (hasAll) return symbolsTypes
    return [{ name: i18n('all', locale) || 'All', value: '' }, ...symbolsTypes]
  }, [symbolsTypes, locale])


  return (
    <div className="superchart-symbol-search-overlay" onClick={handleBackdropClick} onKeyDown={handleKeyDown}>
      <div className="superchart-symbol-search-panel">
        {/* Header: title + close */}
        <div className="superchart-symbol-search-title">
          <span>{i18n('symbol_search', locale) || 'Symbol search'}</span>
          <button className="superchart-symbol-search-close" onClick={onClose}>
            <svg viewBox="0 0 14 14" width="14" height="14">
              <path d="M13.7.3c-.4-.4-1-.4-1.4 0L7 5.6 1.7.3C1.3-.1.7-.1.3.3c-.4.4-.4 1 0 1.4L5.6 7 .3 12.3c-.4.4-.4 1 0 1.4.2.2.4.3.7.3s.5-.1.7-.3L7 8.4l5.3 5.3c.2.2.5.3.7.3s.5-.1.7-.3c.4-.4.4-1 0-1.4L8.4 7l5.3-5.3c.4-.4.4-1 0-1.4z" fill="currentColor" />
            </svg>
          </button>
        </div>

        {/* Search input */}
        <div className="superchart-symbol-search-header">
          <svg className="superchart-symbol-search-icon" viewBox="0 0 18 18" width="18" height="18">
            <path d="M12.5 11h-.79l-.28-.27a6.5 6.5 0 001.48-5.34c-.47-2.78-2.79-5-5.59-5.34A6.505 6.505 0 000 6.5 6.5 6.5 0 006.5 13c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L17.49 16l-4.99-5zm-6 0C4.01 11 2 8.99 2 6.5S4.01 2 6.5 2 11 4.01 11 6.5 8.99 11 6.5 11z" fill="currentColor" />
          </svg>
          <input
            ref={inputRef}
            className="superchart-symbol-search-input"
            type="text"
            placeholder={i18n('symbol_code', locale) || 'Search...'}
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button className="superchart-symbol-search-clear" onClick={() => setQuery('')}>
              <svg viewBox="0 0 14 14" width="12" height="12">
                <path d="M13.7.3c-.4-.4-1-.4-1.4 0L7 5.6 1.7.3C1.3-.1.7-.1.3.3c-.4.4-.4 1 0 1.4L5.6 7 .3 12.3c-.4.4-.4 1 0 1.4.2.2.4.3.7.3s.5-.1.7-.3L7 8.4l5.3 5.3c.2.2.5.3.7.3s.5-.1.7-.3c.4-.4.4-1 0-1.4L8.4 7l5.3-5.3c.4-.4.4-1 0-1.4z" fill="currentColor" />
              </svg>
            </button>
          )}
        </div>

        {/* Symbol type tabs (All, Crypto, Forex, etc.) */}
        {typeTabs && (
          <div className="superchart-symbol-search-tabs">
            {typeTabs.map(t => (
              <button
                key={t.value}
                className={`superchart-symbol-search-tab ${selectedType === t.value ? 'active' : ''}`}
                onClick={() => { setSelectedType(t.value); setActiveIndex(0) }}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}



        {/* Results list */}
        <div className="superchart-symbol-search-results" ref={listRef}>
          {loading && results.length === 0 && (
            <div className="superchart-symbol-search-empty">Searching...</div>
          )}
          {!loading && results.length === 0 && query && (
            <div className="superchart-symbol-search-empty">No symbols found</div>
          )}
          {results.map((symbol, index) => (
            <div
              key={`${symbol.ticker}-${symbol.exchange}-${index}`}
              className={`superchart-symbol-search-row ${index === activeIndex ? 'active' : ''}`}
              data-active={index === activeIndex}
              onClick={() => {
                onSymbolSelected(symbol)
                onClose()
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {/* Symbol logo */}
              <div className="superchart-symbol-search-logo-wrap">
                {symbol.logo
                  ? <img className="superchart-symbol-search-logo" alt="" src={symbol.logo} />
                  : <div className="superchart-symbol-search-logo-placeholder" />
                }
              </div>

              {/* Ticker (bold) */}
              <span className="superchart-symbol-search-ticker">
                {highlightMatch(symbol.shortName ?? symbol.ticker, query)}
              </span>

              {/* Description */}
              <span className="superchart-symbol-search-desc">
                {highlightMatch(symbol.name ?? '', query)}
              </span>

              {/* Type badge */}
              {symbol.type && (
                <span className="superchart-symbol-search-type">{symbol.type}</span>
              )}

              {/* Exchange name + logo */}
              <span className="superchart-symbol-search-exchange">
                {symbol.exchange ?? ''}
                {symbol.exchangeLogo && (
                  <img className="superchart-symbol-search-exchange-logo" alt="" src={symbol.exchangeLogo} />
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SymbolSearchModal
