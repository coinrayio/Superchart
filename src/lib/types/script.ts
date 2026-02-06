/**
 * Script Editor Types
 *
 * Types for the script editor widget, language definitions,
 * and server-side script execution providers.
 */

import type { IndicatorSubscription, IndicatorMetadata, SettingValue } from './indicator'
import type { Period, SymbolInfo } from './chart'

// ---------------------------------------------------------------------------
// Language Definition (editor-agnostic)
// ---------------------------------------------------------------------------

/**
 * Declarative language definition for the script editor.
 * Translated internally to CodeMirror extensions.
 * Consumers can provide their own to support custom languages.
 */
export interface ScriptLanguageDefinition {
  /** Language name (e.g., 'pine', 'python', 'lua') */
  name: string
  /** File extension (e.g., '.pine', '.py') */
  extension?: string
  /** Language keywords to highlight */
  keywords: string[]
  /** Type keywords (highlighted differently) */
  typeKeywords?: string[]
  /** Built-in function definitions (for highlighting + autocomplete) */
  builtinFunctions: ScriptBuiltinFunction[]
  /** Built-in variable definitions (for highlighting + autocomplete) */
  builtinVariables?: ScriptBuiltinVariable[]
  /** Comment syntax */
  comments: {
    /** Line comment prefix (e.g., '//') */
    line?: string
    /** Block comment start (e.g., '/*') */
    blockStart?: string
    /** Block comment end (e.g., '* /') */
    blockEnd?: string
  }
  /** Operator characters */
  operators?: string[]
  /** String delimiters (default: ['"', "'"]) */
  stringDelimiters?: string[]
}

export interface ScriptBuiltinFunction {
  /** Function name (e.g., 'sma') */
  name: string
  /** Human-readable description for autocomplete */
  description?: string
  /** Parameter definitions */
  parameters?: ScriptFunctionParameter[]
  /** Return type description */
  returnType?: string
}

export interface ScriptFunctionParameter {
  /** Parameter name */
  name: string
  /** Parameter type */
  type: string
  /** Parameter description */
  description?: string
  /** Whether this parameter is optional */
  optional?: boolean
}

export interface ScriptBuiltinVariable {
  /** Variable name (e.g., 'close') */
  name: string
  /** Human-readable description */
  description?: string
  /** Variable type */
  type?: string
}

// ---------------------------------------------------------------------------
// Script Provider (server-side execution)
// ---------------------------------------------------------------------------

/**
 * Provider interface for server-side script compilation and execution.
 * Follows the same opt-in pattern as IndicatorProvider.
 */
export interface ScriptProvider {
  /**
   * Compile/validate a script without executing it.
   * Returns compilation diagnostics and metadata about the script.
   */
  compile(code: string, language: string): Promise<ScriptCompileResult>

  /**
   * Execute a script as a chart indicator.
   * Returns an IndicatorSubscription (same type as backend indicators),
   * enabling seamless integration with the existing calc bridge pipeline.
   */
  executeAsIndicator(params: ScriptExecuteParams): Promise<IndicatorSubscription>

  /**
   * Execute a script as a trading bot (optional).
   * Returns a BotSubscription that emits trading signals.
   */
  executeAsBot?(params: ScriptExecuteParams): Promise<BotSubscription>

  /**
   * Stop a running script (indicator or bot).
   */
  stop(scriptId: string): Promise<void>

  /**
   * List user's saved scripts (optional).
   */
  listScripts?(): Promise<ScriptInfo[]>

  /**
   * Save a script (optional).
   */
  saveScript?(script: ScriptSaveParams): Promise<ScriptInfo>

  /**
   * Delete a saved script (optional).
   */
  deleteScript?(scriptId: string): Promise<void>

  /**
   * Cleanup resources.
   */
  dispose?(): void
}

// ---------------------------------------------------------------------------
// Script execution
// ---------------------------------------------------------------------------

export interface ScriptExecuteParams {
  /** Script source code */
  code: string
  /** Language identifier (matches ScriptLanguageDefinition.name) */
  language: string
  /** Current symbol */
  symbol: SymbolInfo
  /** Current period */
  period: Period
  /** User-configured settings (from indicator settings modal) */
  settings?: Record<string, SettingValue>
}

export interface ScriptCompileResult {
  /** Whether compilation succeeded */
  success: boolean
  /** Compilation errors */
  errors?: ScriptDiagnostic[]
  /** Compilation warnings */
  warnings?: ScriptDiagnostic[]
  /**
   * Metadata about the compiled script (plots, settings, etc.).
   * Reuses IndicatorMetadata so compiled scripts integrate seamlessly
   * with the backend indicator rendering pipeline.
   */
  metadata?: IndicatorMetadata
}

export interface ScriptDiagnostic {
  /** Line number (1-based) */
  line: number
  /** Column number (1-based) */
  column: number
  /** End line number */
  endLine?: number
  /** End column number */
  endColumn?: number
  /** Diagnostic message */
  message: string
  /** Severity level */
  severity: 'error' | 'warning' | 'info'
}

// ---------------------------------------------------------------------------
// Bot subscription
// ---------------------------------------------------------------------------

export interface BotSubscription {
  /** Unique bot instance ID */
  botId: string
  /** Register handler for trading signals */
  onSignal(handler: (signal: BotSignal) => void): void
  /** Register error handler */
  onError?(handler: (error: Error) => void): void
  /** Stop the bot and cleanup */
  dispose(): void
}

export interface BotSignal {
  /** Signal type */
  type: 'buy' | 'sell' | 'close' | 'modify'
  /** Signal timestamp */
  timestamp: number
  /** Target price */
  price?: number
  /** Order quantity */
  quantity?: number
  /** Stop loss price */
  stopLoss?: number
  /** Take profit price */
  takeProfit?: number
  /** Additional signal metadata */
  metadata?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Script management
// ---------------------------------------------------------------------------

export interface ScriptInfo {
  /** Unique script ID */
  id: string
  /** Script name */
  name: string
  /** Script source code */
  code: string
  /** Language identifier */
  language: string
  /** Creation timestamp */
  createdAt: number
  /** Last modified timestamp */
  updatedAt: number
  /** Script description */
  description?: string
}

export interface ScriptSaveParams {
  /** Script name */
  name: string
  /** Script source code */
  code: string
  /** Language identifier */
  language: string
  /** Script description */
  description?: string
}
