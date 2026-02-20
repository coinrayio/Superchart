# Script Execution (Pine Script)

The `ScriptProvider` interface connects Superchart to a backend that can compile and execute trading scripts. When provided, a script editor button appears in the period bar toolbar. The built-in `ScriptEditor` component is also exportable for standalone use.

Scripts executed via `ScriptProvider` return an `IndicatorSubscription` — the same type used by `IndicatorProvider`. This means compiled scripts flow through the exact same calc-bridge rendering pipeline as backend indicators.

---

## ScriptProvider Interface

```typescript
export interface ScriptProvider {
  /**
   * Compile/validate script source without executing it.
   * Returns diagnostics (errors, warnings) and optional metadata
   * about what the script will plot.
   */
  compile(code: string, language: string): Promise<ScriptCompileResult>

  /**
   * Execute a script as a chart indicator.
   * Returns an IndicatorSubscription — data flows through the calc bridge
   * the same way as backend indicators.
   */
  executeAsIndicator(params: ScriptExecuteParams): Promise<IndicatorSubscription>

  /**
   * Optional. Execute a script as a trading bot.
   * Returns a BotSubscription that emits trading signals.
   */
  executeAsBot?(params: ScriptExecuteParams): Promise<BotSubscription>

  /**
   * Stop a running script. Cleans up server-side resources.
   */
  stop(scriptId: string): Promise<void>

  /** Optional. List saved scripts for the current user. */
  listScripts?(): Promise<ScriptInfo[]>

  /** Optional. Save a script to the backend. */
  saveScript?(script: ScriptSaveParams): Promise<ScriptInfo>

  /** Optional. Delete a saved script. */
  deleteScript?(scriptId: string): Promise<void>

  /** Optional. Clean up all connections when the chart is disposed. */
  dispose?(): void
}
```

---

## Script Execution Types

### ScriptExecuteParams

```typescript
export interface ScriptExecuteParams {
  /** Script source code */
  code: string
  /** Language identifier matching ScriptLanguageDefinition.name */
  language: string
  /** Symbol context for execution */
  symbol: SymbolInfo
  /** Period context for execution */
  period: Period
  /** User-configured settings from the indicator settings modal */
  settings?: Record<string, SettingValue>
}
```

### ScriptCompileResult

```typescript
export interface ScriptCompileResult {
  success: boolean
  errors?: ScriptDiagnostic[]
  warnings?: ScriptDiagnostic[]
  /**
   * Metadata about what the script will plot.
   * Reuses IndicatorMetadata — same plots, settings, and axes system
   * as backend indicators.
   */
  metadata?: IndicatorMetadata
}
```

### ScriptDiagnostic

Used by both `ScriptCompileResult` and the `ScriptEditor` component's `diagnostics` prop.

```typescript
export interface ScriptDiagnostic {
  line: number         // 1-based line number
  column: number       // 1-based column number
  endLine?: number
  endColumn?: number
  message: string
  severity: 'error' | 'warning' | 'info'
}
```

---

## Bot Subscription

When `executeAsBot` is implemented, it returns a `BotSubscription` that emits trading signals.

```typescript
export interface BotSubscription {
  botId: string
  onSignal(handler: (signal: BotSignal) => void): void
  onError?(handler: (error: Error) => void): void
  dispose(): void
}

export interface BotSignal {
  type: 'buy' | 'sell' | 'close' | 'modify'
  timestamp: number
  price?: number
  quantity?: number
  stopLoss?: number
  takeProfit?: number
  metadata?: Record<string, unknown>
}
```

---

## Script Management

```typescript
export interface ScriptInfo {
  id: string
  name: string
  code: string
  language: string
  createdAt: number   // Unix ms
  updatedAt: number   // Unix ms
  description?: string
}

export interface ScriptSaveParams {
  name: string
  code: string
  language: string
  description?: string
}
```

---

## ScriptLanguageDefinition

Defines the language used by the script editor for syntax highlighting, keyword completion, and autocomplete. The default (`defaultScriptLanguage`) defines Pine Script v4/v5/v6 with 100+ built-in functions and variables.

```typescript
export interface ScriptLanguageDefinition {
  /** Language identifier matched against ScriptExecuteParams.language */
  name: string
  /** File extension hint (e.g. '.pine') */
  extension?: string
  /** Keywords to highlight as control-flow tokens */
  keywords: string[]
  /** Type qualifiers highlighted differently from keywords */
  typeKeywords?: string[]
  /** Functions for highlighting and autocomplete */
  builtinFunctions: ScriptBuiltinFunction[]
  /** Variables (including namespaces and constants) for autocomplete */
  builtinVariables?: ScriptBuiltinVariable[]
  comments: {
    line?: string       // e.g. '//'
    blockStart?: string // e.g. '/*'
    blockEnd?: string   // e.g. '*/'
  }
  operators?: string[]
  stringDelimiters?: string[]
}
```

### ScriptBuiltinFunction

```typescript
export interface ScriptBuiltinFunction {
  name: string
  description?: string
  parameters?: ScriptFunctionParameter[]
  returnType?: string
}

export interface ScriptFunctionParameter {
  name: string
  type: string
  description?: string
  optional?: boolean
}
```

### ScriptBuiltinVariable

```typescript
export interface ScriptBuiltinVariable {
  name: string
  description?: string
  type?: string
}
```

---

## ScriptEditor Component

The `ScriptEditor` is a standalone React component. It is used internally by Superchart when a `scriptProvider` is configured, but you can also render it yourself.

```typescript
export interface ScriptEditorProps {
  /** Locale for UI labels (default: 'en-US') */
  locale?: string

  /**
   * Declarative language definition.
   * Defaults to defaultScriptLanguage (Pine Script).
   * Ignored when editorExtensions is provided.
   */
  language?: ScriptLanguageDefinition

  /**
   * Raw CodeMirror 6 extensions.
   * Use this to supply a fully custom language pack.
   * When provided, the language prop is ignored.
   */
  editorExtensions?: unknown[]

  /** Initial source code shown in the editor */
  initialCode?: string

  /** Script name shown in the toolbar dropdown (default: 'Untitled script') */
  scriptName?: string

  /** When true, the primary button changes from 'Add to chart' to 'Update on chart' */
  isOnChart?: boolean

  /** Compilation diagnostics to display as inline error markers */
  diagnostics?: ScriptDiagnostic[]

  /** Called when the user clicks the X (close) button */
  onClose?: () => void

  /**
   * Called when the user clicks 'Add to chart' or 'Update on chart'.
   * Receives the current code string.
   */
  onAddToChart?: (code: string) => void

  /** Called when the user clicks 'Save'. Receives code and script name. */
  onSave?: (code: string, name: string) => void

  /** Called on every code change (debounced by CodeMirror). */
  onChange?: (code: string) => void

  /** Called when the user renames the script */
  onNameChange?: (name: string) => void

  /**
   * When true, the editor is non-editable and shows a 'Clone & Edit' button
   * instead of 'Add to chart'. Used for viewing server preset indicator code.
   */
  readOnly?: boolean

  /**
   * Called when the user clicks 'Clone & Edit' in read-only mode.
   * Receives the code to pre-fill the new editable editor.
   */
  onCloneAndEdit?: (code: string) => void
}
```

### Read-Only Viewer and Clone Flow

When `readOnly={true}`:
- The editor is non-editable (CodeMirror `readOnly` extension applied).
- A banner reads "View only — click Clone & Edit to make your own copy".
- The primary toolbar button is "Clone & Edit" instead of "Add to chart".
- Clicking "Clone & Edit" calls `onCloneAndEdit(code)` and internally sets `readOnly = false`, allowing the user to edit the forked copy.

Superchart uses this flow when `IndicatorProvider.getIndicatorCode` is configured: clicking the code icon on an indicator tooltip opens a read-only viewer showing the backend Pine Script source. The user can clone it to their own script editor.

---

## WebSocketScriptProvider Reference Implementation

The `examples/client/src/script/WebSocketScriptProvider.ts` is a complete WebSocket-based implementation. Key design points to follow in your own implementation:

**Message protocol** (client → server):

| `type` | Fields | Description |
|---|---|---|
| `compile` | `code`, `language`, `requestId` | Compile without executing |
| `execute` | `code`, `language`, `symbol`, `period`, `settings`, `requestId` | Execute as indicator |
| `stop` | `scriptId` | Stop a running script |
| `loadHistory` | `scriptId`, `before` (Unix ms) | Request historical backfill |

**Message protocol** (server → client):

| `type` | Fields | Description |
|---|---|---|
| `*` (with `requestId`) | `requestId`, result | Response to a request |
| `indicatorData` | `scriptId`, `data` (`IndicatorDataPoint[]`) | Full dataset |
| `indicatorTick` | `scriptId`, `data` (`IndicatorDataPoint`) | Single real-time update |
| `indicatorHistory` | `scriptId`, `data` (`IndicatorDataPoint[]`) | Historical backfill batch |
| `error` | `scriptId`, `error` | Error message |

**Buffering pattern**: The provider stores incoming data in a buffer (`bufferedData`, `bufferedTicks`, `bufferedHistory`) until the caller registers the corresponding handler. When the handler is registered, buffered events are replayed immediately. This prevents race conditions where data arrives before Superchart has finished wiring the subscription.

**History backfill**: The provider exposes a `loadHistoryBefore(before: number): void` method. This is called from `dataLoader.setOnBarsLoaded`:

```typescript
const scriptProvider = new WebSocketScriptProvider('wss://api.example.com/ws')
const dataLoader = createDataLoader(datafeed)

dataLoader.setOnBarsLoaded((fromMs: number) => {
  scriptProvider.loadHistoryBefore(fromMs)
})

const chart = new Superchart({
  container: 'chart',
  symbol,
  period,
  dataLoader,
  scriptProvider,
})
```

---

## Using ScriptEditor Standalone

You can render `ScriptEditor` outside of a `Superchart` instance — for example, in a dedicated "Pine Script editor" page:

```typescript
import { ScriptEditor, defaultScriptLanguage } from 'superchart'

function EditorPage() {
  const handleAddToChart = async (code: string) => {
    const result = await scriptProvider.compile(code, 'pine')
    if (!result.success) {
      // diagnostics are shown automatically when passed as prop
      return
    }
    const subscription = await scriptProvider.executeAsIndicator({
      code,
      language: 'pine',
      symbol: currentSymbol,
      period: currentPeriod,
    })
    // Wire subscription to your indicator pipeline...
  }

  return (
    <ScriptEditor
      locale="en-US"
      language={defaultScriptLanguage}
      onClose={() => router.back()}
      onAddToChart={handleAddToChart}
      onSave={async (code, name) => {
        await scriptProvider.saveScript({ name, code, language: 'pine' })
      }}
    />
  )
}
```
