/**
 * ScriptEditor - Code editor widget for writing trading scripts
 *
 * Uses CodeMirror 6 when available (optional peer dependency).
 * Falls back to a plain textarea if CodeMirror is not installed.
 */

import { useState, useRef, useEffect, useCallback, useSyncExternalStore } from 'react'
import { Modal } from '../../component'
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
  /** Compilation diagnostics to display */
  diagnostics?: ScriptDiagnostic[]
  /** Called when modal closes */
  onClose: () => void
  /** Called when user clicks "Add to Chart" */
  onAddToChart?: (code: string) => void
  /** Called when user clicks "Run as Bot" */
  onRunAsBot?: (code: string) => void
  /** Called when user clicks "Save" */
  onSave?: (code: string) => void
  /** Called when code changes */
  onChange?: (code: string) => void
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
  diagnostics: externalDiagnostics,
  onClose,
  onAddToChart,
  onRunAsBot,
  onSave,
  onChange,
}: ScriptEditorProps) {
  const theme = useStoreValue(store.theme, store.subscribeTheme)

  const [code, setCode] = useState(initialCode ?? DEFAULT_CODE)
  const [fontSize, setFontSize] = useState(14)
  const [output, setOutput] = useState('')
  const [diagnostics, setDiagnostics] = useState<ScriptDiagnostic[]>(externalDiagnostics ?? [])
  const [cmAvailable, setCmAvailable] = useState<boolean | null>(null) // null = loading

  const editorContainerRef = useRef<HTMLDivElement>(null)
  const editorViewRef = useRef<unknown>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

        if (cancelled || !editorContainerRef.current) return

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
          } catch {
            // Language adapter import failed — continue without syntax highlighting
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
      } catch {
        // CodeMirror not available — use textarea fallback
        if (!cancelled) {
          setCmAvailable(false)
        }
      }
    }

    loadCodeMirror()

    return () => {
      cancelled = true
      if (editorViewRef.current) {
        (editorViewRef.current as { destroy(): void }).destroy()
        editorViewRef.current = null
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = useCallback(() => {
    onSave?.(code)
    setOutput(i18n('save_script', locale) || 'Script saved')
  }, [code, onSave, locale])

  const handleAddToChart = useCallback(() => {
    onAddToChart?.(code)
  }, [code, onAddToChart])

  const handleRunAsBot = useCallback(() => {
    onRunAsBot?.(code)
  }, [code, onRunAsBot])

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
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave, handleAddToChart, onClose])

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value
    setCode(newCode)
    onChange?.(newCode)
  }, [onChange])

  const lineCount = code.split('\n').length

  const errors = diagnostics.filter(d => d.severity === 'error')
  const warnings = diagnostics.filter(d => d.severity === 'warning')

  return (
    <Modal
      title={i18n('script_editor', locale) || 'Script Editor'}
      width={820}
      buttons={[
        ...(onSave ? [{
          type: 'confirm' as const,
          children: i18n('save_script', locale) || 'Save',
          onClick: handleSave,
        }] : []),
        ...(onAddToChart ? [{
          type: 'confirm' as const,
          children: i18n('add_to_chart', locale) || 'Add to Chart',
          onClick: handleAddToChart,
        }] : []),
        ...(onRunAsBot ? [{
          type: 'confirm' as const,
          children: i18n('run_as_bot', locale) || 'Run as Bot',
          onClick: handleRunAsBot,
        }] : []),
      ]}
      onClose={onClose}
    >
      <div className="superchart-script-editor">
        {/* Toolbar */}
        <div className="superchart-se-toolbar">
          <span className="superchart-se-toolbar-label">
            {(language ?? defaultScriptLanguage).name.toUpperCase()}
          </span>
          <div className="superchart-se-toolbar-right">
            <label className="superchart-se-font-size">
              <span>{i18n('font_size', locale) || 'Font'}</span>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
              >
                {[12, 13, 14, 15, 16, 18].map(s => (
                  <option key={s} value={s}>{s}px</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Main content: Editor + Output */}
        <div className="superchart-se-body">
          {/* Editor area */}
          <div className="superchart-se-editor">
            {cmAvailable === null && (
              <div className="superchart-se-loading">Loading editor...</div>
            )}
            {cmAvailable === true && (
              <div
                ref={editorContainerRef}
                className="superchart-se-cm-container"
              />
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

          {/* Output panel */}
          <div className="superchart-se-output">
            <div className="superchart-se-output-header">
              {i18n('output', locale) || 'Output'}
            </div>
            <div className="superchart-se-output-content">
              {errors.length > 0 && (
                <div className="superchart-se-diagnostics superchart-se-errors">
                  {errors.map((d, i) => (
                    <div key={i} className="superchart-se-diagnostic">
                      <span className="superchart-se-diag-location">
                        {i18n('line', locale) || 'Line'} {d.line}:{d.column}
                      </span>
                      <span className="superchart-se-diag-message">{d.message}</span>
                    </div>
                  ))}
                </div>
              )}
              {warnings.length > 0 && (
                <div className="superchart-se-diagnostics superchart-se-warnings">
                  {warnings.map((d, i) => (
                    <div key={i} className="superchart-se-diagnostic">
                      <span className="superchart-se-diag-location">
                        {i18n('line', locale) || 'Line'} {d.line}:{d.column}
                      </span>
                      <span className="superchart-se-diag-message">{d.message}</span>
                    </div>
                  ))}
                </div>
              )}
              {output && !errors.length && (
                <div className="superchart-se-success">{output}</div>
              )}
              {!output && !errors.length && !warnings.length && (
                <div className="superchart-se-placeholder">
                  {i18n('compilation_output_placeholder', locale) || 'Compilation output will appear here'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default ScriptEditor
