/**
 * PeriodBar - Toolbar for period selection and chart controls
 *
 * Follows the pattern from coinray-chart-ui/src/widget/period-bar
 */

import { useState, useCallback, useSyncExternalStore } from 'react'
import type { Period } from '../types/chart'
import * as store from '../store/chartStore'

export interface PeriodBarProps {
  /** Available periods */
  periods?: Period[]
  /** Locale for translations */
  locale?: string
  /** Called when menu toggle is clicked */
  onMenuClick?: () => void
  /** Called when symbol is clicked */
  onSymbolClick?: () => void
  /** Called when period changes */
  onPeriodChange?: (period: Period) => void
  /** Called when indicator button is clicked */
  onIndicatorClick?: () => void
  /** Called when timezone button is clicked */
  onTimezoneClick?: () => void
  /** Called when settings button is clicked */
  onSettingClick?: () => void
  /** Called when screenshot button is clicked */
  onScreenshotClick?: () => void
}

// Hook to subscribe to store values
function useStoreValue<T>(
  getValue: () => T,
  subscribe: (listener: (value: T) => void) => () => void
): T {
  return useSyncExternalStore(subscribe, getValue, getValue)
}

const defaultPeriods: Period[] = [
  { span: 1, type: 'minute', text: '1m' },
  { span: 5, type: 'minute', text: '5m' },
  { span: 15, type: 'minute', text: '15m' },
  { span: 1, type: 'hour', text: '1H' },
  { span: 4, type: 'hour', text: '4H' },
  { span: 1, type: 'day', text: '1D' },
  { span: 1, type: 'week', text: '1W' },
]

export function PeriodBar(props: PeriodBarProps) {
  const {
    periods = defaultPeriods,
    onMenuClick,
    onSymbolClick,
    onPeriodChange,
    onIndicatorClick,
    onTimezoneClick,
    onSettingClick,
    onScreenshotClick,
  } = props

  const [showPeriodList, setShowPeriodList] = useState(false)

  // Subscribe to store values
  const symbol = useStoreValue(store.symbol, store.subscribeSymbol)
  const period = useStoreValue(store.period, store.subscribePeriod)
  const drawingBarVisible = useStoreValue(store.drawingBarVisible, store.subscribeDrawingBarVisible)
  const fullScreen = useStoreValue(store.fullScreen, store.subscribeFullScreen)

  const handlePeriodSelect = useCallback((p: Period) => {
    store.setPeriod(p)
    onPeriodChange?.(p)
    setShowPeriodList(false)
  }, [onPeriodChange])

  const handleFullScreenToggle = useCallback(() => {
    const rootId = store.rootElementId()
    if (!fullScreen) {
      const el = rootId ? document.getElementById(rootId) : document.querySelector('.superchart')
      if (el) {
        const requestFullscreen = el.requestFullscreen
          ?? (el as any).webkitRequestFullscreen
          ?? (el as any).mozRequestFullScreen
          ?? (el as any).msRequestFullscreen
        requestFullscreen?.call(el)
      }
    } else {
      const exitFullscreen = document.exitFullscreen
        ?? (document as any).msExitFullscreen
        ?? (document as any).mozCancelFullScreen
        ?? (document as any).webkitExitFullscreen
      exitFullscreen?.call(document)
    }
    store.setFullScreen(!fullScreen)
  }, [fullScreen])

  return (
    <div className="superchart-period-bar">
      {/* Menu toggle */}
      <div className="superchart-period-bar__menu" onClick={onMenuClick}>
        <svg
          className={drawingBarVisible ? '' : 'rotate'}
          viewBox="0 0 1024 1024"
          width="20"
          height="20"
        >
          <path d="M192.037 287.953h640.124c17.673 0 32-14.327 32-32s-14.327-32-32-32H192.037c-17.673 0-32 14.327-32 32s14.327 32 32 32zM832.161 479.169H438.553c-17.673 0-32 14.327-32 32s14.327 32 32 32h393.608c17.673 0 32-14.327 32-32s-14.327-32-32-32zM832.161 735.802H192.037c-17.673 0-32 14.327-32 32s14.327 32 32 32h640.124c17.673 0 32-14.327 32-32s-14.327-32-32-32zM319.028 351.594l-160 160 160 160z" />
        </svg>
      </div>

      {/* Symbol */}
      {symbol && (
        <div className="superchart-period-bar__symbol" onClick={onSymbolClick}>
          {symbol.logo && <img src={symbol.logo} alt={symbol.name ?? symbol.ticker} />}
          <span>{symbol.shortName ?? symbol.name ?? symbol.ticker}</span>
        </div>
      )}

      {/* Period selector */}
      <div className="superchart-period-bar__period">
        <button
          className="superchart-period-bar__period-btn"
          onClick={() => setShowPeriodList(!showPeriodList)}
        >
          {period?.text ?? '1H'}
        </button>
        {showPeriodList && (
          <>
            <div
              className="superchart-period-bar__backdrop"
              onClick={() => setShowPeriodList(false)}
            />
            <ul className="superchart-period-bar__period-list">
              {periods.map((p) => (
                <li
                  key={`${p.span}-${p.type}`}
                  className={period?.text === p.text ? 'selected' : ''}
                  onClick={() => handlePeriodSelect(p)}
                >
                  {p.text}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Tools */}
      <div className="superchart-period-bar__tools">
        {/* Indicators */}
        <button className="superchart-period-bar__tool" onClick={onIndicatorClick}>
          <svg viewBox="0 0 20 20" width="18" height="18">
            <path d="M15.873,20L3.65079,20C1.5873,20,0,18.3871,0,16.2903L0,3.70968C-3.78442e-7,1.6129,1.5873,0,3.65079,0L15.873,0C17.9365,0,19.5238,1.6129,19.5238,3.70968C19.5238,4.35484,19.2063,4.51613,18.5714,4.51613C17.9365,4.51613,17.619,4.19355,17.619,3.70968C17.619,2.74194,16.8254,1.93548,15.873,1.93548L3.65079,1.93548C2.69841,1.93548,1.90476,2.74194,1.90476,3.70968L1.90476,16.2903C1.90476,17.2581,2.69841,18.0645,3.65079,18.0645L15.873,18.0645C16.8254,18.0645,17.619,17.2581,17.619,16.2903C17.619,15.8065,18.0952,15.3226,18.5714,15.3226C19.0476,15.3226,19.5238,15.8065,19.5238,16.2903C19.5238,18.2258,17.9365,20,15.873,20ZM14.9206,12.9032C14.7619,12.9032,14.4444,12.9032,14.2857,12.7419L11.2698,9.35484C10.9524,9.03226,10.9524,8.54839,11.2698,8.22581C11.5873,7.90323,12.0635,7.90323,12.381,8.22581L15.3968,11.6129C15.7143,11.9355,15.7143,12.4194,15.3968,12.7419C15.3968,12.9032,15.2381,12.9032,14.9206,12.9032ZM11.4286,13.2258C11.2698,13.2258,11.1111,13.2258,10.9524,13.0645C10.6349,12.7419,10.6349,12.4194,10.9524,12.0968L15.0794,7.74193C15.3968,7.41935,15.7143,7.41935,16.0317,7.74193C16.3492,8.06452,16.3492,8.3871,16.0317,8.70968L11.9048,13.0645C11.746,13.2258,11.5873,13.2258,11.4286,13.2258Z" />
          </svg>
          <span>Indicators</span>
        </button>

        {/* Timezone */}
        <button className="superchart-period-bar__tool" onClick={onTimezoneClick}>
          <svg viewBox="0 0 20 20" width="18" height="18">
            <path d="M10,0C4.48,0,0,4.48,0,10C0,15.52,4.48,20,10,20C15.52,20,20,15.52,20,10C20,4.48,15.52,0,10,0ZM10,18C5.59,18,2,14.41,2,10C2,5.59,5.59,2,10,2C14.41,2,18,5.59,18,10C18,14.41,14.41,18,10,18ZM10.5,5H9V11L14.25,14.15L15,12.92L10.5,10.25V5Z" />
          </svg>
          <span>Timezone</span>
        </button>

        {/* Settings */}
        <button className="superchart-period-bar__tool" onClick={onSettingClick}>
          <svg viewBox="0 0 20 20" width="18" height="18">
            <path d="M19.7361,12.542L18.1916,11.2919C18.2647,10.8678,18.3025,10.4347,18.3025,10.0017C18.3025,9.56861,18.2647,9.13555,18.1916,8.71142L19.7361,7.46135C19.9743,7.26938,20.0615,6.95686,19.9554,6.6756L19.9342,6.61756C19.5074,5.49026,18.8755,4.45449,18.0549,3.53926L18.0124,3.49238C17.8096,3.26692,17.4819,3.1821,17.1848,3.28032L15.2677,3.92544C14.5603,3.3763,13.7704,2.94324,12.9168,2.63966L12.5466,0.742229C12.49,0.449802,12.2472,0.222111,11.9383,0.168536L11.8746,0.157375C10.6461,-0.0524583,9.35391,-0.0524583,8.1254,0.157375L8.06174,0.168536C7.75284,0.222111,7.50997,0.449802,7.45338,0.742229L7.08082,2.64859C6.2343,2.95217,5.44909,3.383,4.74641,3.92991L2.81522,3.28032C2.52047,3.1821,2.19036,3.26469,1.98757,3.49238L1.94513,3.53926C1.12455,4.45672,0.492609,5.49249,0.0658141,6.61756L0.0445921,6.6756C-0.0615171,6.95463,0.0257283,7.26715,0.263885,7.46135L1.82723,8.72482C1.75413,9.14448,1.71876,9.57308,1.71876,9.99944C1.71876,10.428,1.75413,10.8566,1.82723,11.2741L0.263885,12.5375C0.025729,12.7295,-0.0615164,13.042,0.0445929,13.3233L0.0658148,13.3813C0.49261,14.5064,1.12455,15.5444,1.94513,16.4596L1.98757,16.5065C2.19036,16.732,2.51812,16.8168,2.81522,16.7186L4.74641,16.069C5.44909,16.6159,6.2343,17.0489,7.08082,17.3503L7.45338,19.2567C7.50997,19.5491,7.75284,19.7768,8.06174,19.8303L8.1254,19.8415C8.74084,19.9464,9.37042,20,10,20C10.6296,20,11.2615,19.9464,11.8746,19.8415L11.9383,19.8303C12.2472,19.7768,12.49,19.5491,12.5466,19.2567L12.9168,17.3592C13.7704,17.0556,14.5603,16.6248,15.2677,16.0734L17.1848,16.7186C17.4795,16.8168,17.8096,16.7342,18.0124,16.5065L18.0549,16.4596C18.8755,15.5422,19.5074,14.5064,19.9342,13.3813L19.9554,13.3233C20.0615,13.0487,19.9743,12.7362,19.7361,12.542ZM10.0024,13.7095C7.7104,13.7095,5.85231,11.9504,5.85231,9.78068C5.85231,7.61092,7.7104,5.85189,10.0024,5.85189C12.2943,5.85189,14.1524,7.61092,14.1524,9.78068C14.1524,11.9504,12.2943,13.7095,10.0024,13.7095Z" />
          </svg>
          <span>Settings</span>
        </button>

        {/* Screenshot */}
        <button className="superchart-period-bar__tool" onClick={onScreenshotClick}>
          <svg viewBox="0 0 20 20" width="18" height="18">
            <path d="M6.51,1h6.98c0.15,0,0.28,0.11,0.31,0.26l0.23,1.26c0.11,0.61,0.63,1.05,1.23,1.05h2.24c1.38,0,2.5,1.15,2.5,2.57v10.29c0,1.42-1.12,2.57-2.5,2.57H2.5C1.12,19,0,17.85,0,16.43V6.14c0-1.42,1.12-2.57,2.5-2.57h2.24c0.6,0,1.12-0.44,1.23-1.05l0.23-1.26C6.23,1.11,6.36,1,6.51,1z M10,6.14c-2.93,0-5.31,2.45-5.31,5.46s2.38,5.46,5.31,5.46s5.31-2.45,5.31-5.46S12.93,6.14,10,6.14z M10,9.68c-1.04,0-1.88,0.86-1.88,1.93s0.84,1.93,1.88,1.93s1.88-0.86,1.88-1.93S11.04,9.68,10,9.68z" />
          </svg>
          <span>Screenshot</span>
        </button>

        {/* Fullscreen */}
        <button className="superchart-period-bar__tool" onClick={handleFullScreenToggle}>
          {fullScreen ? (
            <svg viewBox="0 0 20 20" width="18" height="18">
              <path d="M1.08,0L0,1.08l4.19,4.2L2.55,6.92h4.36V2.56L5.29,4.18L1.08,0zM15.81,5.28L20,1.08L18.92,0L14.71,4.18L13.09,2.56v4.36h4.36L15.81,5.28zM4.17,14.7L0.08,18.81L1.16,20l4.11-4.2l1.64,1.64v-4.36H2.55L4.17,14.7zM17.45,13.08h-4.36v4.36l1.64-1.64L18.84,20l1.08-1.19l-4.09-4.1L17.45,13.08z" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" width="18" height="18">
              <path d="M2.93,1.77l4.64,4.64L6.39,7.6L1.77,2.93L0,4.7V0h4.7L2.93,1.77zM6.41,12.4l-4.64,4.64L0,15.28v4.7h4.7l-1.77-1.77l4.64-4.64L6.41,12.4zM15.28,0l1.77,1.77l-4.64,4.64l1.19,1.19l4.64-4.64L20,4.72V0H15.28zM13.57,12.4l-1.19,1.19l4.64,4.64L15.25,20h4.72v-4.72l-1.77,1.77L13.57,12.4z" />
            </svg>
          )}
          <span>{fullScreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
        </button>
      </div>
    </div>
  )
}

export default PeriodBar
