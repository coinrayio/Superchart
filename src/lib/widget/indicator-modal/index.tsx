/**
 * Indicator Modal Widget — TradingView-style layout
 */

import { useState, useRef, useEffect } from 'react'
import { Modal } from '../../component'
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
  'MA', 'EMA', 'VOL', 'MACD', 'BOLL', 'KDJ', 'RSI', 'BIAS', 'BRAR', 'CCI',
  'DMI', 'CR', 'PSY', 'DMA', 'TRIX', 'OBV', 'VR', 'WR', 'MTM', 'EMV',
  'SAR', 'SMA', 'ROC', 'PVT', 'BBI', 'AO',
]

const CATEGORY_LABELS: Record<string, string> = {
  moving_average: 'Moving Average',
  trend: 'Trend',
  momentum: 'Momentum',
  oscillator: 'Oscillator',
  volume: 'Volume',
  volatility: 'Volatility',
  custom: 'Custom',
}

const SIDEBAR_GROUPS = [
  {
    label: 'Personal',
    items: [
      { id: 'personal-my-scripts', label: 'My Scripts' },
      { id: 'personal-invite-only', label: 'Invite Only' },
      { id: 'personal-purchased', label: 'Purchased' },
    ],
  },
  {
    label: 'Built-in',
    items: [
      { id: 'built-in-technicals', label: 'Technicals' },
      { id: 'built-in-fundamentals', label: 'Fundamentals' },
    ],
  },
  {
    label: 'Community',
    items: [
      { id: 'community-editors-picks', label: "Editor's Picks" },
      { id: 'community-top', label: 'Top' },
      { id: 'community-trending', label: 'Trending' },
      { id: 'community-store', label: 'Store' },
    ],
  },
]

const PANEL_TABS = [
  { id: 'indicators', label: 'Indicators' },
  { id: 'strategies', label: 'Strategies' },
  { id: 'profiles', label: 'Profiles' },
  { id: 'patterns', label: 'Patterns' },
] as const

type PanelTab = (typeof PANEL_TABS)[number]['id']

function CheckIcon() {
  return (
    <svg className="superchart-indicator-check" width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 7l4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
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
  backendIndicators = [],
  activeBackendIndicators = [],
  onBackendIndicatorToggle,
}: IndicatorModalProps) {
  const [sidebarSection, setSidebarSection] = useState('built-in-technicals')
  const [panelTab, setPanelTab] = useState<PanelTab>('indicators')
  const [searchQuery, setSearchQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  const activeNames = new Set(activeBackendIndicators)
  const lowerSearch = searchQuery.toLowerCase().trim()

  // ------ Indicator row renderer ------

  function BuiltinRow({
    name,
    isMain,
    isActive,
    displayName,
  }: {
    name: string
    isMain: boolean
    isActive: boolean
    displayName: string
  }) {
    return (
      <li
        className="superchart-indicator-modal-row"
        onClick={() => {
          if (isMain) {
            onMainIndicatorChange({ name, id: 'candle_pane', added: !isActive })
          } else {
            onSubIndicatorChange({ name, id: subIndicators[name] ?? '', added: !isActive })
          }
        }}
      >
        <span className="superchart-indicator-modal-row-name">{displayName}</span>
        <div className="superchart-indicator-modal-row-right">
          {isMain && (
            <span className="superchart-indicator-tag">Overlay</span>
          )}
          {isActive && <CheckIcon />}
        </div>
      </li>
    )
  }

  function BackendRow({ def }: { def: IndicatorDefinition }) {
    const isActive = activeNames.has(def.name)
    return (
      <li
        className="superchart-indicator-modal-row"
        onClick={() => onBackendIndicatorToggle?.(def, !isActive)}
      >
        <span className="superchart-indicator-modal-row-name">{def.shortName}</span>
        <div className="superchart-indicator-modal-row-right">
          {def.isNew && (
            <span className="superchart-indicator-badge superchart-indicator-badge--new">New</span>
          )}
          {def.isUpdated && (
            <span className="superchart-indicator-badge superchart-indicator-badge--updated">Updated</span>
          )}
          {isActive && <CheckIcon />}
        </div>
      </li>
    )
  }

  // ------ Content for the right panel ------

  function renderContent() {
    // When searching: show all matching indicators regardless of sidebar
    if (lowerSearch) {
      const mainMatches = MAIN_INDICATOR_LIST.filter((n) =>
        n.toLowerCase().includes(lowerSearch)
      )
      const subMatches = SUB_INDICATOR_LIST.filter(
        (n) => !MAIN_INDICATOR_LIST.includes(n) && n.toLowerCase().includes(lowerSearch)
      )
      const backendMatches = backendIndicators.filter(
        (d) =>
          d.name.toLowerCase().includes(lowerSearch) ||
          d.shortName.toLowerCase().includes(lowerSearch) ||
          (d.description ?? '').toLowerCase().includes(lowerSearch)
      )

      const hasAny = mainMatches.length > 0 || subMatches.length > 0 || backendMatches.length > 0
      if (!hasAny) {
        return (
          <li className="superchart-indicator-modal-empty">
            No indicators match &ldquo;{searchQuery}&rdquo;
          </li>
        )
      }

      return (
        <>
          {mainMatches.map((name) => (
            <BuiltinRow
              key={`main-${name}`}
              name={name}
              isMain
              isActive={mainIndicators.includes(name)}
              displayName={i18n(name.toLowerCase(), locale) || name}
            />
          ))}
          {subMatches.map((name) => (
            <BuiltinRow
              key={`sub-${name}`}
              name={name}
              isMain={false}
              isActive={name in subIndicators}
              displayName={i18n(name.toLowerCase(), locale) || name}
            />
          ))}
          {backendMatches.map((def) => (
            <BackendRow key={`backend-${def.name}`} def={def} />
          ))}
        </>
      )
    }

    // No search — show based on sidebar section
    if (panelTab !== 'indicators') {
      return (
        <li className="superchart-indicator-modal-empty">
          {panelTab === 'strategies' && 'No strategies available yet.'}
          {panelTab === 'profiles' && 'No profiles available yet.'}
          {panelTab === 'patterns' && 'No patterns available yet.'}
        </li>
      )
    }

    switch (sidebarSection) {
      case 'built-in-technicals': {
        const grouped = groupByCategory(backendIndicators)
        const catOrder = Object.keys(CATEGORY_LABELS).filter((c) => grouped[c])
        const extraCats = Object.keys(grouped).filter((c) => !CATEGORY_LABELS[c])

        return (
          <>
            {/* Klinecharts built-in indicators */}
            <li className="superchart-indicator-modal-group-title">Built-in Overlay</li>
            {MAIN_INDICATOR_LIST.map((name) => (
              <BuiltinRow
                key={`main-${name}`}
                name={name}
                isMain
                isActive={mainIndicators.includes(name)}
                displayName={i18n(name.toLowerCase(), locale) || name}
              />
            ))}
            <li className="superchart-indicator-modal-group-title">Built-in Sub-pane</li>
            {SUB_INDICATOR_LIST.filter((n) => !MAIN_INDICATOR_LIST.includes(n)).map((name) => (
              <BuiltinRow
                key={`sub-${name}`}
                name={name}
                isMain={false}
                isActive={name in subIndicators}
                displayName={i18n(name.toLowerCase(), locale) || name}
              />
            ))}
            {/* Server preset indicators, grouped by category */}
            {[...catOrder, ...extraCats].map((cat) => (
              <div key={`cat-${cat}`}>
                <li className="superchart-indicator-modal-group-title">
                  {CATEGORY_LABELS[cat] ?? cat}
                </li>
                {grouped[cat].map((def) => (
                  <BackendRow key={`backend-${def.name}`} def={def} />
                ))}
              </div>
            ))}
          </>
        )
      }

      case 'personal-my-scripts':
        return (
          <li className="superchart-indicator-modal-empty">
            Your saved scripts will appear here.
          </li>
        )

      default:
        return (
          <li className="superchart-indicator-modal-empty">
            Nothing here yet.
          </li>
        )
    }
  }

  return (
    <Modal
      title={i18n('indicator', locale) || 'Indicators'}
      width={720}
      onClose={onClose}
      className="superchart-indicator-modal"
    >
      {/* Search bar */}
      <div className="superchart-indicator-modal-search">
        <svg className="superchart-indicator-modal-search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10.5 10.5l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          ref={searchRef}
          className="superchart-indicator-modal-search-input"
          type="text"
          placeholder="Search indicators..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            className="superchart-indicator-modal-search-clear"
            onClick={() => setSearchQuery('')}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Body: sidebar + panel */}
      <div className="superchart-indicator-modal-body">
        {/* Left sidebar */}
        <div className="superchart-indicator-modal-sidebar">
          {SIDEBAR_GROUPS.map((group) => (
            <div key={group.label} className="superchart-indicator-modal-sidebar-group">
              <div className="superchart-indicator-modal-sidebar-group-label">{group.label}</div>
              {group.items.map((item) => (
                <div
                  key={item.id}
                  className={`superchart-indicator-modal-sidebar-item${sidebarSection === item.id ? ' active' : ''}`}
                  onClick={() => setSidebarSection(item.id)}
                >
                  {item.label}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Right panel */}
        <div className="superchart-indicator-modal-panel">
          {/* Panel tabs */}
          <div className="superchart-indicator-modal-panel-tabs">
            {PANEL_TABS.map((tab) => (
              <button
                key={tab.id}
                className={`superchart-indicator-modal-panel-tab${panelTab === tab.id ? ' active' : ''}`}
                onClick={() => setPanelTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Indicator list */}
          <ul className="superchart-indicator-modal-list">
            {renderContent()}
          </ul>
        </div>
      </div>
    </Modal>
  )
}

export default IndicatorModal
