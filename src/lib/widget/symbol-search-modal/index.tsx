/**
 * Symbol Search Modal Widget
 */

import { useState, useEffect, useCallback } from 'react'
import { Modal, List, Input } from '../../component'
import i18n from '../../i18n'

export interface SymbolInfo {
  ticker: string
  name?: string
  shortName?: string
  logo?: string
  exchange?: string
  pricePrecision?: number
  volumePrecision?: number
}

export interface SymbolSearchDatafeed {
  searchSymbols: (query: string) => Promise<SymbolInfo[]>
}

export interface SymbolSearchModalProps {
  locale: string
  datafeed: SymbolSearchDatafeed
  onSymbolSelected: (symbol: SymbolInfo) => void
  onClose: () => void
}

export function SymbolSearchModal({
  locale,
  datafeed,
  onSymbolSelected,
  onClose,
}: SymbolSearchModalProps) {
  const [value, setValue] = useState('')
  const [symbolList, setSymbolList] = useState<SymbolInfo[]>([])
  const [loading, setLoading] = useState(false)

  const searchSymbols = useCallback(
    async (query: string) => {
      if (!query) {
        setSymbolList([])
        return
      }
      setLoading(true)
      try {
        const results = await datafeed.searchSymbols(query)
        setSymbolList(results)
      } catch (error) {
        console.error('Failed to search symbols:', error)
        setSymbolList([])
      } finally {
        setLoading(false)
      }
    },
    [datafeed]
  )

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchSymbols(value)
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [value, searchSymbols])

  return (
    <Modal
      title={i18n('symbol_search', locale)}
      width={460}
      onClose={onClose}
    >
      <Input
        className="superchart-symbol-search-modal-input"
        placeholder={i18n('symbol_code', locale)}
        suffix={
          <svg viewBox="0 0 1024 1024">
            <path d="M945.066667 898.133333l-189.866667-189.866666c55.466667-64 87.466667-149.333333 87.466667-241.066667 0-204.8-168.533333-373.333333-373.333334-373.333333S96 264.533333 96 469.333333 264.533333 842.666667 469.333333 842.666667c91.733333 0 174.933333-34.133333 241.066667-87.466667l189.866667 189.866667c6.4 6.4 14.933333 8.533333 23.466666 8.533333s17.066667-2.133333 23.466667-8.533333c8.533333-12.8 8.533333-34.133333-2.133333-46.933334zM469.333333 778.666667C298.666667 778.666667 160 640 160 469.333333S298.666667 160 469.333333 160 778.666667 298.666667 778.666667 469.333333 640 778.666667 469.333333 778.666667z" />
          </svg>
        }
        value={value}
        onChange={(v) => setValue(String(v))}
      />
      <List
        className="superchart-symbol-search-modal-list"
        loading={loading}
        dataSource={symbolList}
        renderItem={(symbol: SymbolInfo) => (
          <li
            onClick={() => {
              onSymbolSelected(symbol)
              onClose()
            }}
          >
            <div>
              {symbol.logo && <img alt="symbol" src={symbol.logo} />}
              <span title={symbol.name ?? ''}>
                {symbol.shortName ?? symbol.ticker}
                {symbol.name ? `(${symbol.name})` : ''}
              </span>
            </div>
            {symbol.exchange ?? ''}
          </li>
        )}
      />
    </Modal>
  )
}

export default SymbolSearchModal
