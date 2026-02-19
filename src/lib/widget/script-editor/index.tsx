/**
 * ScriptEditor - Code editor modal for writing trading scripts (TradingView-style)
 *
 * Uses CodeMirror 6 when available (optional peer dependency).
 * Falls back to a plain textarea if CodeMirror is not installed.
 */

import { useState, useRef, useEffect, useCallback, useSyncExternalStore } from 'react'
import i18n from '../../i18n'
import * as store from '../../store/chartStore'
import type { ScriptLanguageDefinition, ScriptDiagnostic } from '../../types/script'
import { defaultScriptLanguage } from './defaultLanguage'

export interface ScriptEditorProps {
  /** Locale for translations */
  locale?: string
  /** Language definition (declarative, defaults to Pine-like) */
  language?: ScriptLanguageDefinition
  /** Raw CodeMirror extensions (overrides language prop if provided) */
  editorExtensions?: unknown[]
  /** Initial source code */
  initialCode?: string
  /** Script name (default: "Untitled script") */
  scriptName?: string
  /** Whether script is already on chart (changes "Add" to "Update") */
  isOnChart?: boolean
  /** Compilation diagnostics to display */
  diagnostics?: ScriptDiagnostic[]
  /** Called when modal is closed */
  onClose?: () => void
  /** Called when user clicks "Add to Chart" or "Update on Chart" */
  onAddToChart?: (code: string) => void
  /** Called when user clicks "Save" */
  onSave?: (code: string, name: string) => void
  /** Called when code changes */
  onChange?: (code: string) => void
  /** Called when script name changes */
  onNameChange?: (name: string) => void
}

const DEFAULT_CODE_TWO = `//@version=6
indicator(title="Stochastic", shorttitle="Stoch", format=format.price, precision=2, timeframe="", timeframe_gaps=true)
periodK = input.int(14, title="%K Length", minval=1)
smoothK = input.int(1, title="%K Smoothing", minval=1)
periodD = input.int(3, title="%D Smoothing", minval=1)
k = ta.sma(ta.stoch(close, high, low, periodK), smoothK)
d = ta.sma(k, periodD)
plot(k, title="%K", color=#2962FF)
plot(d, title="%D", color=#FF6D00)
h0 = hline(80, "Upper Band", color=#787B86)
hline(50, "Middle Band", color=color.new(#787B86, 50))
h1 = hline(20, "Lower Band", color=#787B86)
fill(h0, h1, color=color.rgb(33, 150, 243, 90), title="Background")
`

const DEFAULT_CODE = `//@version=4
// Credits to LazyBear and JustUncleL.. more features added by ZyadaCharts


study("TDI - Traders Dynamic Index + RSI Divergences + Buy/Sell Signals", shorttitle="TDI + RSI Div")

rsiPeriod = input(14, minval = 1, title = "RSI Period")
bandLength = input(34, minval = 1, title = "Band Length")
lengthrsipl = input(7, minval = 0, title = "Fast MA on RSI")
lengthtradesl = input(2, minval = 1, title = "Slow MA on RSI")

src1 = close                                                             // Source of Calculations (Close of Bar)
r = rsi(src1, rsiPeriod)                                                 // RSI of Close
ma = sma(r, bandLength)                                                 // Moving Average of RSI [current]
offs = (1.6185 * stdev(r, bandLength))                                  // Offset
up = ma + offs                                                          // Upper Bands
dn = ma - offs                                                          // Lower Bands
mid = (up + dn) / 2                                                     // Average of Upper and Lower Bands
mbb = sma(r, lengthrsipl)                                            // Moving Average of RSI 2 bars back
mab = sma(r, lengthtradesl)                                          // Moving Average of RSI 7 bars back


hline(30, color=color.red, linewidth=1, linestyle=hline.style_dotted)
hline(50, color=color.orange, linewidth=1, linestyle=hline.style_dotted)
hline(70, color=color.green, linewidth=1, linestyle=hline.style_dotted)

// Plot the TDI
upl=plot(up, color=#12bcc9, transp=60, title="VB Channel High",linewidth=2)
dnl=plot(dn, color=#12bcc9, transp=60, title="VB Channel Low",linewidth=2)
midl=plot(mid, color=color.orange, transp=40, linewidth=2, title="MBL")
mabl=plot(mab, color=color.lime, transp=30, linewidth=2, title="RSI PL")
mbbl=plot(mbb, color=color.red, transp=60, linewidth=2, title="TSL Signal")

//
//create RSI TSL cloud to indicate trend direction.
fill(mabl,mbbl, color=mab>mbb?color.green:color.red,transp=80)
// fill(upl, midl, color.green, transp=95)                                   
// fill(midl, dnl, color.red, transp=95)        


//long/short labels

long1= crossover(mab, mbb) and mbb > mid and mbb > 50
short1= crossunder(mab, mbb) and mbb < mid and mbb < 50

plotshape(long1, style=shape.labelup, location=location.bottom, color=color.lime, size=size.tiny, editable=true)
plotshape(short1, style=shape.labeldown, location=location.top, color=color.red, size=size.tiny, editable=true)

alertcondition(long1, title='Long', message='Crossover')
alertcondition(short1, title='Short', message='Crossunder')

best_setup = crossover(mab, mid) 
alertcondition(best_setup, title="RSI Crosses Yellow", message="rsi crosses mid")

scalp= mab > mid 
bgcolor(scalp ? color.lime : na, transp=95)

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////



// Divergences //


len = input(title="RSI Period", minval=1, defval=14)
src = input(title="RSI Source", defval=close)
lbR = input(title="Pivot Lookback Right", defval=5)
lbL = input(title="Pivot Lookback Left", defval=5)
rangeUpper = input(title="Max of Lookback Range", defval=60)
rangeLower = input(title="Min of Lookback Range", defval=5)
plotBull = input(title="Plot Bullish", defval=true)
plotHiddenBull = input(title="Plot Hidden Bullish", defval=false)
plotBear = input(title="Plot Bearish", defval=true)
plotHiddenBear = input(title="Plot Hidden Bearish", defval=false)
bearColor = color.red
bullColor = color.green
hiddenBullColor = color.new(color.green, 80)
hiddenBearColor = color.new(color.red, 80)
textColor = color.white
noneColor = color.new(color.white, 100)
osc = rsi(src, len)

// // plot(osc, title="RSI", linewidth=2, color=#8D1699)
// hline(50, title="Middle Line", linewidth=2, linestyle=hline.style_dotted)
// obLevel = hline(70, title="Overbought", linewidth=2, linestyle=hline.style_dotted)
// osLevel = hline(30, title="Oversold", linewidth=2, linestyle=hline.style_dotted)

plFound = na(pivotlow(osc, lbL, lbR)) ? false : true
phFound = na(pivothigh(osc, lbL, lbR)) ? false : true
_inRange(cond) =>
	bars = barssince(cond == true)
	rangeLower <= bars and bars <= rangeUpper


//------------------------------------------------------------------------------
// Regular Bullish
// Osc: Higher Low

oscHL = osc[lbR] > valuewhen(plFound, osc[lbR], 1) and _inRange(plFound[1])

// Price: Lower Low

priceLL = low[lbR] < valuewhen(plFound, low[lbR], 1)
bullCond = plotBull and priceLL and oscHL and plFound

plot(
     plFound ? osc[lbR] : na,
     offset=-lbR,
     title="Regular Bullish",
     linewidth=2,
     color=(bullCond ? bullColor : noneColor),
     transp=0
     )

plotshape(
	 bullCond ? osc[lbR] : na,
	 offset=-lbR,
	 title="Regular Bullish Label",
	 text=" Bull ",
	 style=shape.labelup,
	 location=location.absolute,
	 color=bullColor,
	 textcolor=textColor,
	 transp=0
	 )

//------------------------------------------------------------------------------
// Hidden Bullish
// Osc: Lower Low

oscLL = osc[lbR] < valuewhen(plFound, osc[lbR], 1) and _inRange(plFound[1])

// Price: Higher Low

priceHL = low[lbR] > valuewhen(plFound, low[lbR], 1)
hiddenBullCond = plotHiddenBull and priceHL and oscLL and plFound

plot(
	 plFound ? osc[lbR] : na,
	 offset=-lbR,
	 title="Hidden Bullish",
	 linewidth=2,
	 color=(hiddenBullCond ? hiddenBullColor : noneColor),
	 transp=0
	 )

plotshape(
	 hiddenBullCond ? osc[lbR] : na,
	 offset=-lbR,
	 title="Hidden Bullish Label",
	 text=" H Bull ",
	 style=shape.labelup,
	 location=location.absolute,
	 color=bullColor,
	 textcolor=textColor,
	 transp=0
	 )

//------------------------------------------------------------------------------
// Regular Bearish
// Osc: Lower High

oscLH = osc[lbR] < valuewhen(phFound, osc[lbR], 1) and _inRange(phFound[1])

// Price: Higher High

priceHH = high[lbR] > valuewhen(phFound, high[lbR], 1)

bearCond = plotBear and priceHH and oscLH and phFound

plot(
	 phFound ? osc[lbR] : na,
	 offset=-lbR,
	 title="Regular Bearish",
	 linewidth=2,
	 color=(bearCond ? bearColor : noneColor),
	 transp=0
	 )

plotshape(
	 bearCond ? osc[lbR] : na,
	 offset=-lbR,
	 title="Regular Bearish Label",
	 text=" Bear ",
	 style=shape.labeldown,
	 location=location.absolute,
	 color=bearColor,
	 textcolor=textColor,
	 transp=0
	 )

//------------------------------------------------------------------------------
// Hidden Bearish
// Osc: Higher High

oscHH = osc[lbR] > valuewhen(phFound, osc[lbR], 1) and _inRange(phFound[1])

// Price: Lower High

priceLH = high[lbR] < valuewhen(phFound, high[lbR], 1)

hiddenBearCond = plotHiddenBear and priceLH and oscHH and phFound

plot(
	 phFound ? osc[lbR] : na,
	 offset=-lbR,
	 title="Hidden Bearish",
	 linewidth=2,
	 color=(hiddenBearCond ? hiddenBearColor : noneColor),
	 transp=0
	 )

plotshape(
	 hiddenBearCond ? osc[lbR] : na,
	 offset=-lbR,
	 title="Hidden Bearish Label",
	 text=" H Bear ",
	 style=shape.labeldown,
	 location=location.absolute,
	 color=bearColor,
	 textcolor=textColor,
	 transp=0
	 )
`

// Hook to subscribe to store values
function useStoreValue<T>(
  getValue: () => T,
  subscribe: (listener: (value: T) => void) => () => void
): T {
  return useSyncExternalStore(subscribe, getValue, getValue)
}

export function ScriptEditor({
  locale = 'en-US',
  language,
  editorExtensions,
  initialCode,
  scriptName: initialScriptName,
  isOnChart = false,
  diagnostics: externalDiagnostics,
  onClose,
  onAddToChart,
  onSave,
  onChange,
  onNameChange,
}: ScriptEditorProps) {
  const theme = useStoreValue(store.theme, store.subscribeTheme)

  const [code, setCode] = useState(initialCode ?? DEFAULT_CODE)
  const [scriptName, setScriptName] = useState(initialScriptName || 'Untitled script')
  const [fontSize, setFontSize] = useState(14)
  const [diagnostics, setDiagnostics] = useState<ScriptDiagnostic[]>(externalDiagnostics ?? [])
  const [cmAvailable, setCmAvailable] = useState<boolean | null>(null) // null = loading
  const [showScriptMenu, setShowScriptMenu] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showHelpSubmenu, setShowHelpSubmenu] = useState(false)
  const [submenuPosition, setSubmenuPosition] = useState<'left' | 'right'>('right')
  const [profilerMode, setProfilerMode] = useState(false)
  const [isAnchored, setIsAnchored] = useState(true)

  const editorContainerRef = useRef<HTMLDivElement>(null)
  const editorViewRef = useRef<unknown>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scriptMenuRef = useRef<HTMLDivElement>(null)
  const moreMenuRef = useRef<HTMLDivElement>(null)
  const helpMenuRef = useRef<HTMLDivElement>(null)

  // Update diagnostics when external diagnostics change
  useEffect(() => {
    if (externalDiagnostics) {
      setDiagnostics(externalDiagnostics)
    }
  }, [externalDiagnostics])

  // Try to load CodeMirror on mount
  useEffect(() => {
    let cancelled = false

    async function loadCodeMirror() {
      try {
        const [
          { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection },
          { EditorState },
          { defaultKeymap, history, historyKeymap },
          { searchKeymap, highlightSelectionMatches },
        ] = await Promise.all([
          import('@codemirror/view'),
          import('@codemirror/state'),
          import('@codemirror/commands'),
          import('@codemirror/search'),
        ])

        if (cancelled) {
          return
        }

        if (!editorContainerRef.current) {
          setCmAvailable(false)
          return
        }

        // Build extensions
        const extensions: unknown[] = [
          lineNumbers(),
          highlightActiveLine(),
          drawSelection(),
          history(),
          highlightSelectionMatches(),
          keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap] as never[]),
          EditorView.updateListener.of((update: { docChanged: boolean; state: { doc: { toString(): string } } }) => {
            if (update.docChanged) {
              const newCode = update.state.doc.toString()
              setCode(newCode)
              onChange?.(newCode)
            }
          }),
          EditorView.theme({
            '&': {
              height: '100%',
              fontSize: `${fontSize}px`,
              backgroundColor: theme === 'dark' ? '#1e222d' : '#ffffff',
            },
            '.cm-scroller': {
              overflow: 'auto',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", "Courier New", monospace',
            },
            '.cm-content': {
              minHeight: '200px',
              caretColor: theme === 'dark' ? '#d1d4dc' : '#3b3b3b',
            },
            '.cm-line': {
              color: theme === 'dark' ? '#d1d4dc' : '#3b3b3b',
            },
            '.cm-gutters': {
              backgroundColor: theme === 'dark' ? '#131722' : '#f5f5f5',
              color: theme === 'dark' ? '#787b86' : '#999',
              border: 'none',
            },
            '.cm-activeLineGutter': {
              backgroundColor: theme === 'dark' ? '#2a2e39' : '#e8e8e8',
            },
            '.cm-activeLine': {
              backgroundColor: theme === 'dark' ? 'rgba(42, 46, 57, 0.3)' : 'rgba(0, 0, 0, 0.05)',
            },
            '.cm-selectionBackground, ::selection': {
              backgroundColor: theme === 'dark' ? '#264f78' : '#b3d7ff',
            },
            '&.cm-focused .cm-selectionBackground, &.cm-focused ::selection': {
              backgroundColor: theme === 'dark' ? '#264f78' : '#b3d7ff',
            },
            '.cm-cursor': {
              borderLeftColor: theme === 'dark' ? '#d1d4dc' : '#3b3b3b',
            },
            // Autocomplete tooltip styling
            '.cm-tooltip-autocomplete': {
              backgroundColor: theme === 'dark' ? '#1e222d' : '#ffffff',
              border: `1px solid ${theme === 'dark' ? '#2a2e39' : '#ddd'}`,
              borderRadius: '4px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", "Courier New", monospace',
            },
            '.cm-tooltip-autocomplete ul': {
              margin: '0',
              padding: '4px 0',
              listStyle: 'none',
            },
            '.cm-tooltip-autocomplete ul li': {
              padding: '4px 8px',
              cursor: 'pointer',
              color: theme === 'dark' ? '#d1d4dc' : '#3b3b3b',
            },
            '.cm-tooltip-autocomplete ul li[aria-selected]': {
              backgroundColor: theme === 'dark' ? '#2a2e39' : '#e8e8e8',
              color: theme === 'dark' ? '#ffffff' : '#000000',
            },
            '.cm-completionLabel': {
              color: theme === 'dark' ? '#d1d4dc' : '#3b3b3b',
            },
            '.cm-completionDetail': {
              color: theme === 'dark' ? '#787b86' : '#999',
              fontStyle: 'italic',
              marginLeft: '8px',
            },
            '.cm-completionInfo': {
              backgroundColor: theme === 'dark' ? '#131722' : '#f5f5f5',
              border: `1px solid ${theme === 'dark' ? '#2a2e39' : '#ddd'}`,
              borderRadius: '4px',
              padding: '8px',
              maxWidth: '400px',
              color: theme === 'dark' ? '#d1d4dc' : '#3b3b3b',
            },
            // Tooltip styling
            '.cm-tooltip': {
              backgroundColor: theme === 'dark' ? '#1e222d' : '#ffffff',
              border: `1px solid ${theme === 'dark' ? '#2a2e39' : '#ddd'}`,
              borderRadius: '4px',
              color: theme === 'dark' ? '#d1d4dc' : '#3b3b3b',
            },
            // Search panel styling
            '.cm-panel': {
              backgroundColor: theme === 'dark' ? '#131722' : '#f5f5f5',
              borderTop: `1px solid ${theme === 'dark' ? '#2a2e39' : '#ddd'}`,
              color: theme === 'dark' ? '#d1d4dc' : '#3b3b3b',
            },
            '.cm-panel input': {
              backgroundColor: theme === 'dark' ? '#1e222d' : '#ffffff',
              border: `1px solid ${theme === 'dark' ? '#2a2e39' : '#ddd'}`,
              borderRadius: '4px',
              color: theme === 'dark' ? '#d1d4dc' : '#3b3b3b',
              padding: '4px 8px',
            },
            '.cm-panel button': {
              backgroundColor: theme === 'dark' ? '#2a2e39' : '#e8e8e8',
              border: `1px solid ${theme === 'dark' ? '#2a2e39' : '#ddd'}`,
              borderRadius: '4px',
              color: theme === 'dark' ? '#d1d4dc' : '#3b3b3b',
              padding: '4px 8px',
              cursor: 'pointer',
            },
            '.cm-panel button:hover': {
              backgroundColor: theme === 'dark' ? '#363a45' : '#d8d8d8',
            },
          }),
        ]

        // Add language extensions (DO NOT add oneDark to avoid color conflicts)
        if (editorExtensions) {
          extensions.push(...editorExtensions)
        } else {
          try {
            const { createLanguageExtension } = await import('./languageAdapter')
            const langExts = createLanguageExtension(
              language ?? defaultScriptLanguage,
              theme === 'light' ? 'light' : 'dark'
            )
            extensions.push(...langExts)
          } catch (error) {
            console.info('[ScriptEditor] Language adapter import failed — continue without syntax highlighting', error)
          }
        }

        const state = EditorState.create({
          doc: initialCode ?? DEFAULT_CODE,
          extensions: extensions as never[],
        })

        const view = new EditorView({
          state,
          parent: editorContainerRef.current,
        })

        editorViewRef.current = view
        setCmAvailable(true)
      } catch (error) {
        // CodeMirror not available — use textarea fallback
        if (!cancelled) {
          setCmAvailable(false)
        }
      }
    }

    const timeoutId = setTimeout(() => {
      loadCodeMirror()
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      cancelled = true
      if (editorViewRef.current) {
        (editorViewRef.current as { destroy(): void }).destroy()
        editorViewRef.current = null
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = useCallback(() => {
    onSave?.(code, scriptName)
  }, [code, scriptName, onSave])

  const handleAddToChart = useCallback(() => {
    onAddToChart?.(code)
  }, [code, onAddToChart])

  const handleNameChange = useCallback((newName: string) => {
    setScriptName(newName)
    onNameChange?.(newName)
  }, [onNameChange])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        handleSave()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleAddToChart()
      }
      if (e.key === 'Escape') {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave, handleAddToChart, onClose])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (scriptMenuRef.current && !scriptMenuRef.current.contains(e.target as Node)) {
        setShowScriptMenu(false)
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false)
        setShowHelpSubmenu(false)
      }
    }

    if (showScriptMenu || showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showScriptMenu, showMoreMenu])

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value
    setCode(newCode)
    onChange?.(newCode)
  }, [onChange])

  // Calculate submenu position based on available space
  const handleHelpMouseEnter = useCallback(() => {
    if (helpMenuRef.current) {
      const rect = helpMenuRef.current.getBoundingClientRect()
      const submenuWidth = 220 // min-width from CSS
      const spaceOnRight = window.innerWidth - rect.right
      setSubmenuPosition(spaceOnRight < submenuWidth ? 'left' : 'right')
    }
    setShowHelpSubmenu(true)
  }, [])

  const handleHelpMouseLeave = useCallback(() => {
    setShowHelpSubmenu(false)
  }, [])

  const lineCount = code.split('\n').length
  const errors = diagnostics.filter(d => d.severity === 'error')
  const hasErrors = errors.length > 0

  return (
    <div className={`superchart-script-editor-modal ${isAnchored ? 'anchored' : ''}`}>
      {/* Backdrop */}
      {!isAnchored && <div className="superchart-se-backdrop" onClick={onClose} />}

      {/* Modal content */}
      <div className="superchart-se-modal-content">
        {/* Toolbar */}
        <div className="superchart-se-toolbar">
          <div className="superchart-se-toolbar-left">
            {/* Close button */}
            <button className="superchart-se-icon-btn" onClick={onClose} title="Close">
              <svg width="20" height="20" viewBox="0 0 20 20">
                <path d="M6 6l8 8m0-8l-8 8" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
            </button>

            {/* Anchor/Unanchor button */}
            <button
              className="superchart-se-icon-btn"
              onClick={() => setIsAnchored(!isAnchored)}
              title={isAnchored ? 'Open in new window' : 'Anchor to chart'}
            >
              <svg width="20" height="20" viewBox="0 0 20 20">
                {isAnchored ? (
                  <path d="M4 4h7v2H6v8h8v-5h2v7H4V4z M12 4h4v4l-1.5-1.5L10 11l-1.5-1.5L13 5 12 4z" fill="currentColor"/>
                ) : (
                  <path d="M4 4h12v12H4V4zm2 2v8h8V6H6z" fill="currentColor"/>
                )}
              </svg>
            </button>
          </div>

          <div className="superchart-se-toolbar-center">
            {/* Script name dropdown */}
            <div className="superchart-se-script-dropdown" ref={scriptMenuRef}>
              <button
                className="superchart-se-script-name-btn"
                onClick={() => setShowScriptMenu(!showScriptMenu)}
              >
                <span>{scriptName}</span>
                <svg width="12" height="12" viewBox="0 0 12 12">
                  <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                </svg>
              </button>

              {showScriptMenu && (
                <div className="superchart-se-dropdown-menu">
                  <button className="superchart-se-menu-item" onClick={handleSave}>
                    <span>{i18n('save_script', locale) || 'Save script'}</span>
                  </button>
                  <button className="superchart-se-menu-item">
                    <span>{i18n('make_copy', locale) || 'Make a copy...'}</span>
                  </button>
                  <button className="superchart-se-menu-item" onClick={() => {
                    const newName = prompt('Enter script name:', scriptName)
                    if (newName) handleNameChange(newName)
                    setShowScriptMenu(false)
                  }}>
                    <span>{i18n('rename', locale) || 'Rename...'}</span>
                  </button>
                  <button className="superchart-se-menu-item">
                    <span>{i18n('version_history', locale) || 'Version history...'}</span>
                  </button>
                  <div className="superchart-se-menu-separator" />
                  <button className="superchart-se-menu-item">
                    <span>{i18n('create_new', locale) || 'Create new'}</span>
                  </button>
                  <div className="superchart-se-menu-separator" />
                  <div className="superchart-se-menu-section-title">
                    {i18n('recently_used', locale) || 'RECENTLY USED'}
                  </div>
                  <button className="superchart-se-menu-item">
                    <span>{i18n('open_script', locale) || 'Open script...'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="superchart-se-toolbar-right">
            {/* Save button */}
            {onSave && (
              <button className="superchart-se-save-btn" onClick={handleSave}>
                <svg width="16" height="16" viewBox="0 0 16 16" style={{ marginRight: '6px' }}>
                  <path d="M3 2h7l3 3v8a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1zm2 0v4h5V2H5zm3 8a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" fill="currentColor"/>
                </svg>
                <span>{i18n('save', locale) || 'Save'}</span>
              </button>
            )}

            {/* Add/Update on chart button */}
            {onAddToChart && (
              <button
                className={`superchart-se-primary-btn ${hasErrors ? 'disabled' : ''}`}
                onClick={hasErrors ? undefined : handleAddToChart}
                disabled={hasErrors}
                title={hasErrors ? 'Fix errors before adding to chart' : ''}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" style={{ marginRight: '6px' }}>
                  <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
                <span>{isOnChart ? (i18n('update_on_chart', locale) || 'Update on chart') : (i18n('add_to_chart', locale) || 'Add to chart')}</span>
              </button>
            )}

            {/* Font size selector */}
            <select
              className="superchart-se-font-select"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              title="Font size"
            >
              {[12, 13, 14, 15, 16, 18].map(s => (
                <option key={s} value={s}>{s}px</option>
              ))}
            </select>

            {/* More options button */}
            <div className="superchart-se-more-dropdown" ref={moreMenuRef}>
              <button
                className="superchart-se-icon-btn"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                title="More options"
              >
                <svg width="20" height="20" viewBox="0 0 20 20">
                  <circle cx="10" cy="4" r="1.5" fill="currentColor"/>
                  <circle cx="10" cy="10" r="1.5" fill="currentColor"/>
                  <circle cx="10" cy="16" r="1.5" fill="currentColor"/>
                </svg>
              </button>

              {showMoreMenu && (
                <div className="superchart-se-dropdown-menu superchart-se-dropdown-right">
                  <button className="superchart-se-menu-item">
                    <span>{i18n('editor_settings', locale) || 'Editor settings'}</span>
                  </button>

                  <div className="superchart-se-menu-separator" />

                  <div className="superchart-se-menu-section-title">
                    {i18n('open_editor', locale) || 'OPEN EDITOR'}
                  </div>
                  <button className="superchart-se-menu-item">
                    <span>{i18n('new_tab', locale) || 'New tab'}</span>
                  </button>
                  <button className="superchart-se-menu-item">
                    <span>{i18n('new_window', locale) || 'New window'}</span>
                  </button>

                  <div className="superchart-se-menu-separator" />

                  <div className="superchart-se-menu-section-title">
                    {i18n('developer_tools', locale) || 'DEVELOPER TOOLS'}
                  </div>
                  <button
                    className="superchart-se-menu-item superchart-se-menu-switch"
                    onClick={() => setProfilerMode(!profilerMode)}
                  >
                    <span>{i18n('profiler_mode', locale) || 'Profiler mode'}</span>
                    <div className={`superchart-se-switch ${profilerMode ? 'active' : ''}`}>
                      <div className="superchart-se-switch-thumb" />
                    </div>
                  </button>
                  <button className="superchart-se-menu-item">
                    <span>{(language ?? defaultScriptLanguage).name} {i18n('logs', locale) || 'logs'}</span>
                  </button>

                  <div className="superchart-se-menu-separator" />

                  <button className="superchart-se-menu-item">
                    <span>{i18n('release_notes', locale) || 'Release notes'}</span>
                  </button>

                  {/* Help menu with submenu */}
                  <div
                    ref={helpMenuRef}
                    className="superchart-se-menu-item superchart-se-menu-submenu"
                    onMouseEnter={handleHelpMouseEnter}
                    onMouseLeave={handleHelpMouseLeave}
                  >
                    <span>{i18n('help', locale) || 'Help'}</span>
                    <svg width="12" height="12" viewBox="0 0 12 12" style={{ marginLeft: 'auto' }}>
                      <path d="M5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    </svg>

                    {/* Help submenu */}
                    {showHelpSubmenu && (
                      <div className={`superchart-se-submenu-content ${submenuPosition === 'left' ? 'position-left' : ''}`}>
                        <div className="superchart-se-menu-section-title">
                          {i18n('editor_references', locale) || 'EDITOR REFERENCES'}
                        </div>
                        <button className="superchart-se-menu-item">
                          <span>{i18n('how_to_use', locale) || 'How to use'}</span>
                        </button>
                        <button className="superchart-se-menu-item">
                          <span>{i18n('keyboard_shortcuts', locale) || 'Keyboard shortcuts'}</span>
                        </button>

                        <div className="superchart-se-menu-separator" />

                        <div className="superchart-se-menu-section-title">
                          {(language ?? defaultScriptLanguage).name.toUpperCase()} {i18n('references', locale) || 'REFERENCES'}
                        </div>
                        <button className="superchart-se-menu-item">
                          <span>{i18n('user_manual', locale) || 'User manual'}</span>
                        </button>
                        <button className="superchart-se-menu-item">
                          <span>{i18n('reference_manual', locale) || 'Reference manual...'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Editor area */}
        <div className="superchart-se-editor-area">
          {/* Always render the CodeMirror container so ref is available */}
          <div
            ref={editorContainerRef}
            className="superchart-se-cm-container"
            style={{ display: cmAvailable === true ? 'block' : 'none' }}
          />

          {cmAvailable === null && (
            <div className="superchart-se-loading">Loading editor...</div>
          )}

          {cmAvailable === false && (
            <div className="superchart-se-textarea-wrapper">
              <div className="superchart-se-line-numbers">
                {Array.from({ length: lineCount }, (_, i) => (
                  <div key={i} className="superchart-se-line-number">
                    {i + 1}
                  </div>
                ))}
              </div>
              <textarea
                ref={textareaRef}
                className="superchart-se-textarea"
                value={code}
                onChange={handleTextareaChange}
                spellCheck={false}
                style={{ fontSize: `${fontSize}px` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ScriptEditor
