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

const DEFAULT_CODE = `// Start typing your script here
indicator("My Indicator", overlay=true)

input length = 14

value = sma(close, length)
plot(value, "SMA", color=color.blue)
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
  const [isAnchored, setIsAnchored] = useState(true)

  const editorContainerRef = useRef<HTMLDivElement>(null)
  const editorViewRef = useRef<unknown>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scriptMenuRef = useRef<HTMLDivElement>(null)

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
          { oneDark },
        ] = await Promise.all([
          import('@codemirror/view'),
          import('@codemirror/state'),
          import('@codemirror/commands'),
          import('@codemirror/search'),
          import('@codemirror/theme-one-dark'),
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
            '&': { height: '100%', fontSize: `${fontSize}px` },
            '.cm-scroller': { overflow: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", "Courier New", monospace' },
            '.cm-content': { minHeight: '200px' },
          }),
        ]

        // Apply dark theme
        if (theme === 'dark') {
          extensions.push(oneDark)
        }

        // Add language extensions
        if (editorExtensions) {
          extensions.push(...editorExtensions)
        } else {
          try {
            const { createLanguageExtension } = await import('./languageAdapter')
            const langExts = createLanguageExtension(language ?? defaultScriptLanguage)
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (scriptMenuRef.current && !scriptMenuRef.current.contains(e.target as Node)) {
        setShowScriptMenu(false)
      }
    }

    if (showScriptMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showScriptMenu])

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value
    setCode(newCode)
    onChange?.(newCode)
  }, [onChange])

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
            <button className="superchart-se-icon-btn" title="More options">
              <svg width="20" height="20" viewBox="0 0 20 20">
                <circle cx="10" cy="4" r="1.5" fill="currentColor"/>
                <circle cx="10" cy="10" r="1.5" fill="currentColor"/>
                <circle cx="10" cy="16" r="1.5" fill="currentColor"/>
              </svg>
            </button>
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
