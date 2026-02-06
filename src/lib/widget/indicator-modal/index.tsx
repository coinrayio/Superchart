/**
 * Indicator Modal Widget
 */

import { Modal, List, Checkbox } from '../../component'
import i18n from '../../i18n'
import type { IndicatorDefinition } from '../../types/indicator'

type OnIndicatorChange = (params: {
  name: string
  paneId?: string
  id: string
  added: boolean
}) => void

export interface IndicatorModalProps {
  locale: string
  mainIndicators: string[]
  subIndicators: Record<string, string>
  onMainIndicatorChange: OnIndicatorChange
  onSubIndicatorChange: OnIndicatorChange
  onClose: () => void
  /** Backend indicator definitions from IndicatorProvider */
  backendIndicators?: IndicatorDefinition[]
  /** Names of currently active backend indicators */
  activeBackendIndicators?: string[]
  /** Toggle a backend indicator on/off */
  onBackendIndicatorToggle?: (definition: IndicatorDefinition, added: boolean) => void
}

const MAIN_INDICATOR_LIST = ['MA', 'EMA', 'SMA', 'BOLL', 'SAR', 'BBI']

const SUB_INDICATOR_LIST = [
  'MA',
  'EMA',
  'VOL',
  'MACD',
  'BOLL',
  'KDJ',
  'RSI',
  'BIAS',
  'BRAR',
  'CCI',
  'DMI',
  'CR',
  'PSY',
  'DMA',
  'TRIX',
  'OBV',
  'VR',
  'WR',
  'MTM',
  'EMV',
  'SAR',
  'SMA',
  'ROC',
  'PVT',
  'BBI',
  'AO',
]

/** Category display order and labels */
const CATEGORY_ORDER: Record<string, string> = {
  moving_average: 'Moving Average',
  trend: 'Trend',
  momentum: 'Momentum',
  oscillator: 'Oscillator',
  volume: 'Volume',
  volatility: 'Volatility',
  custom: 'Custom',
}

function groupByCategory(indicators: IndicatorDefinition[]): Record<string, IndicatorDefinition[]> {
  const groups: Record<string, IndicatorDefinition[]> = {}
  for (const ind of indicators) {
    const cat = ind.category || 'custom'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(ind)
  }
  return groups
}

export function IndicatorModal({
  locale,
  mainIndicators,
  subIndicators,
  onMainIndicatorChange,
  onSubIndicatorChange,
  onClose,
  backendIndicators,
  activeBackendIndicators,
  onBackendIndicatorToggle,
}: IndicatorModalProps) {
  // Separate backend indicators into overlay (main) and sub-pane
  const backendOverlays = backendIndicators?.filter(
    (d) => d.paneId === 'candle_pane' || d.isOverlay
  ) ?? []
  const backendSubIndicators = backendIndicators?.filter(
    (d) => d.paneId !== 'candle_pane' && !d.isOverlay
  ) ?? []

  const activeNames = new Set(activeBackendIndicators ?? [])
  const hasBackendIndicators = backendIndicators && backendIndicators.length > 0

  return (
    <Modal
      title={i18n('indicator', locale)}
      width={400}
      onClose={onClose}
    >
      <List className="superchart-indicator-modal-list">
        {/* Built-in main indicators */}
        <li className="title">{i18n('main_indicator', locale)}</li>
        {MAIN_INDICATOR_LIST.map((name) => {
          const checked = mainIndicators.includes(name)
          return (
            <li
              key={name}
              className="row"
              onClick={() => {
                onMainIndicatorChange({
                  name,
                  id: 'candle_pane',
                  added: !checked,
                })
              }}
            >
              <Checkbox
                checked={checked}
                label={i18n(name.toLowerCase(), locale)}
              />
            </li>
          )
        })}

        {/* Backend overlay indicators (on candle pane) */}
        {backendOverlays.length > 0 && backendOverlays.map((def) => {
          const checked = activeNames.has(def.name)
          return (
            <li
              key={`backend-main-${def.name}`}
              className="row"
              onClick={() => onBackendIndicatorToggle?.(def, !checked)}
            >
              <Checkbox checked={checked} label={def.shortName} />
            </li>
          )
        })}

        {/* Built-in sub indicators */}
        <li className="title">{i18n('sub_indicator', locale)}</li>
        {SUB_INDICATOR_LIST.map((name) => {
          const checked = name in subIndicators
          return (
            <li
              key={name}
              className="row"
              onClick={() => {
                onSubIndicatorChange({
                  name,
                  id: subIndicators[name] ?? '',
                  added: !checked,
                })
              }}
            >
              <Checkbox
                checked={checked}
                label={i18n(name.toLowerCase(), locale)}
              />
            </li>
          )
        })}

        {/* Backend sub indicators, grouped by category */}
        {hasBackendIndicators && backendSubIndicators.length > 0 && (() => {
          const grouped = groupByCategory(backendSubIndicators)
          const categories = Object.keys(CATEGORY_ORDER).filter((cat) => grouped[cat])
          // Include any categories not in the predefined order
          const extraCategories = Object.keys(grouped).filter((cat) => !CATEGORY_ORDER[cat])

          return [...categories, ...extraCategories].map((cat) => (
            <div key={`backend-cat-${cat}`}>
              <li className="title">{CATEGORY_ORDER[cat] ?? cat}</li>
              {grouped[cat].map((def) => {
                const checked = activeNames.has(def.name)
                return (
                  <li
                    key={`backend-sub-${def.name}`}
                    className="row"
                    onClick={() => onBackendIndicatorToggle?.(def, !checked)}
                  >
                    <Checkbox checked={checked} label={def.shortName} />
                  </li>
                )
              })}
            </div>
          ))
        })()}
      </List>
    </Modal>
  )
}

export default IndicatorModal
