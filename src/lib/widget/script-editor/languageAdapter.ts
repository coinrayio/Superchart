/**
 * Language Adapter - Translates ScriptLanguageDefinition to CodeMirror 6 extensions
 *
 * Enhanced with:
 * - Snippet completion with parameter placeholders
 * - Hover tooltips showing documentation
 * - Signature information
 */

import { StreamLanguage } from '@codemirror/language'
import { LanguageSupport } from '@codemirror/language'
import { autocompletion, type CompletionContext, type Completion, snippetCompletion } from '@codemirror/autocomplete'
import { tags } from '@lezer/highlight'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import type { Extension } from '@codemirror/state'
import { hoverTooltip } from '@codemirror/view'
import { linter, type Diagnostic } from '@codemirror/lint'

import type { ScriptLanguageDefinition, ScriptBuiltinFunction, ScriptBuiltinVariable } from '../../types/script'

/**
 * Create a CodeMirror StreamLanguage mode from a ScriptLanguageDefinition
 */
function createStreamLanguage(def: ScriptLanguageDefinition) {
  const keywordSet = new Set(def.keywords)
  const typeKeywordSet = new Set(def.typeKeywords ?? [])
  const builtinVariableSet = new Set((def.builtinVariables ?? []).map(v => v.name))

  // Separate namespaces from actual builtin variables
  const namespaceSet = new Set(
    (def.builtinVariables ?? [])
      .filter(v => v.type === 'namespace')
      .map(v => v.name)
  )

  const operatorChars = new Set((def.operators ?? []).join('').split(''))
  const stringDelims = new Set(def.stringDelimiters ?? ['"', "'"])

  const lineComment = def.comments.line
  const blockStart = def.comments.blockStart
  const blockEnd = def.comments.blockEnd

  return StreamLanguage.define({
    startState() {
      return {
        inBlockComment: false,
        inString: null as string | null,
      }
    },

    token(stream, state) {
      // Block comment continuation
      if (state.inBlockComment) {
        if (blockEnd && stream.match(blockEnd)) {
          state.inBlockComment = false
          return 'blockComment'
        }
        stream.next()
        return 'blockComment'
      }

      // String continuation
      if (state.inString) {
        const delim = state.inString
        while (!stream.eol()) {
          const ch = stream.next()
          if (ch === '\\') {
            stream.next() // skip escaped character
          } else if (ch === delim) {
            state.inString = null
            return 'string'
          }
        }
        return 'string'
      }

      // Skip whitespace
      if (stream.eatSpace()) return null

      // Line comment
      if (lineComment && stream.match(lineComment)) {
        stream.skipToEnd()
        return 'lineComment'
      }

      // Block comment start
      if (blockStart && stream.match(blockStart)) {
        state.inBlockComment = true
        return 'blockComment'
      }

      // String start
      const peek = stream.peek()
      if (peek && stringDelims.has(peek)) {
        state.inString = peek
        stream.next()
        return 'string'
      }

      // Numbers
      if (stream.match(/^0x[0-9a-fA-F]+/) || stream.match(/^\d+\.?\d*(?:[eE][+-]?\d+)?/)) {
        return 'number'
      }

      // Annotations (e.g., //@version=1)
      if (stream.match(/^\/\/@\w+/)) {
        stream.skipToEnd()
        return 'meta'
      }

      // Identifiers and keywords
      // Match entire dotted names as single tokens: input.int, ta.sma, color.rgb, etc.
      if (stream.match(/^[a-zA-Z_]\w*/)) {
        let word = stream.current()

        // Continue matching dot-separated parts
        while (stream.peek() === '.' && !stream.match(/^\.\s*\(/, false)) {
          stream.next() // consume the dot
          if (stream.match(/^[a-zA-Z_]\w*/)) {
            word = word + '.' + stream.current()
          } else {
            break
          }
        }

        // NOW check what comes after the complete identifier
        const nextChar = stream.peek()

        // Function call detection (followed by '(' with optional whitespace)
        if (nextChar === '(' || stream.match(/^\s*\(/, false)) {
          return 'function'
        }

        // Check keywords and types (only for simple identifiers without dots)
        if (!word.includes('.')) {
          if (keywordSet.has(word)) return 'keyword'
          if (typeKeywordSet.has(word)) return 'typeName'
        }

        // For dotted names (e.g., color.new, ta.sma, input.int)
        if (word.includes('.')) {
          // Check if the complete dotted name is a builtin constant
          if (builtinVariableSet.has(word)) {
            return 'variableName.special'
          }

          // Check if base is a namespace
          const baseName = word.split('.')[0]
          if (namespaceSet.has(baseName)) {
            // Namespace reference like color.red, format.price
            return 'variableName.special'
          }
        }

        // For simple identifiers (no dots)
        if (!word.includes('.')) {
          // Check if it's a builtin variable/constant (but NOT a namespace when used alone)
          // Namespaces like 'color', 'input', 'ta' when used alone (e.g., as parameter names)
          // should be treated as regular variables
          if (builtinVariableSet.has(word) && !namespaceSet.has(word)) {
            return 'variableName.special'
          }
        }

        // Regular user-defined variable (including namespace names used as parameter names)
        return 'variableName'
      }

      // Operators (multi-char first)
      if (peek && operatorChars.has(peek)) {
        // Try multi-char operators sorted by length
        const sortedOps = (def.operators ?? []).sort((a, b) => b.length - a.length)
        for (const op of sortedOps) {
          if (stream.match(op)) return 'operator'
        }
        stream.next()
        return 'operator'
      }

      // Punctuation
      if (stream.match(/^[()[\]{},;]/)) {
        return 'punctuation'
      }

      // Fallback
      stream.next()
      return null
    },

    languageData: {
      commentTokens: {
        line: lineComment,
        block: blockStart && blockEnd ? { open: blockStart, close: blockEnd } : undefined,
      },
    },

    tokenTable: {
      function: tags.function(tags.variableName),
      'variableName.special': tags.special(tags.variableName),
    },
  })
}

/**
 * Create autocompletion extensions from a ScriptLanguageDefinition
 * with snippet support for function parameters
 */
function createAutocompletion(def: ScriptLanguageDefinition): Extension {
  const completions: Completion[] = []

  // Add keywords
  for (const kw of def.keywords) {
    completions.push({
      label: kw,
      type: 'keyword',
    })
  }

  // Add type keywords
  for (const tk of def.typeKeywords ?? []) {
    completions.push({
      label: tk,
      type: 'type',
    })
  }

  // Add built-in functions with snippet completion
  for (const fn of def.builtinFunctions) {
    const params = fn.parameters ?? []

    // Build parameter signature for detail
    const paramSignature = params
      .map(p => `${p.name}${p.optional ? '?' : ''}: ${p.type}`)
      .join(', ')

    // Build snippet template with numbered placeholders
    let snippet = ''
    if (params.length > 0) {
      const snippetParams = params
        .map((p, i) => `\${${i + 1}:${p.name}}`)
        .join(', ')
      snippet = `${fn.name}(${snippetParams})`
    } else {
      snippet = `${fn.name}()`
    }

    // Build documentation info
    let info = fn.description || ''
    if (params.length > 0) {
      info += '\n\nParameters:\n' + params
        .map(p => `  • ${p.name}: ${p.type}${p.optional ? ' (optional)' : ''}${p.description ? ` - ${p.description}` : ''}`)
        .join('\n')
    }
    if (fn.returnType) {
      info += `\n\nReturns: ${fn.returnType}`
    }

    completions.push(
      snippetCompletion(snippet, {
        label: fn.name,
        type: 'function',
        detail: fn.returnType ? `(${paramSignature}) → ${fn.returnType}` : `(${paramSignature})`,
        info: info.trim(),
      })
    )
  }

  // Add built-in variables
  for (const v of def.builtinVariables ?? []) {
    let info = v.description || ''
    if (v.type) {
      info += `\n\nType: ${v.type}`
    }

    completions.push({
      label: v.name,
      type: 'variable',
      detail: v.type,
      info: info.trim(),
    })
  }

  function completeLanguage(context: CompletionContext) {
    const word = context.matchBefore(/[\w.]*/)
    if (!word || (word.from === word.to && !context.explicit)) return null

    return {
      from: word.from,
      options: completions,
      validFor: /^[\w.]*$/,
    }
  }

  return autocompletion({
    override: [completeLanguage],
    // Show completions after typing a single character
    activateOnTyping: true,
  })
}

/**
 * Create linter extension that validates code in real-time
 */
function createScriptLinter(def: ScriptLanguageDefinition): Extension {
  // Build lookup maps
  const functionMap = new Map<string, ScriptBuiltinFunction>()
  const keywordSet = new Set(def.keywords)

  for (const fn of def.builtinFunctions) {
    functionMap.set(fn.name, fn)
  }

  return linter((view) => {
    const diagnostics: Diagnostic[] = []
    const text = view.state.doc.toString()

    // Detect user-defined function declarations: name(params) =>
    const userFunctions = new Set<string>()
    const funcDeclPattern = /^(\w+)\s*\([^)]*\)\s*=>/gm
    let funcDeclMatch: RegExpExecArray | null
    while ((funcDeclMatch = funcDeclPattern.exec(text)) !== null) {
      userFunctions.add(funcDeclMatch[1])
    }

    // Function call pattern: matches dotted names like input.int, ta.sma, or simple names like sma
    // Matches: functionName (with optional dots) followed by (
    const functionCallPattern = /([a-zA-Z_]\w*(?:\.\w+)*)\s*\(/g
    let match: RegExpExecArray | null

    while ((match = functionCallPattern.exec(text)) !== null) {
      const functionName = match[1]
      const startPos = match.index

      // Skip if it's a keyword or user-defined function
      if (keywordSet.has(functionName) || userFunctions.has(functionName)) {
        continue
      }

      // Check if function exists
      const fn = functionMap.get(functionName)
      if (!fn) {
        diagnostics.push({
          from: startPos,
          to: startPos + functionName.length,
          severity: 'error',
          message: `Could not find function or function reference '${functionName}'`,
        })
        continue
      }

      // Find the closing parenthesis and count parameters
      let parenDepth = 1
      let pos = match.index + match[0].length
      let paramCount = 0
      let hasParams = false

      while (pos < text.length && parenDepth > 0) {
        const ch = text[pos]
        if (ch === '(') {
          parenDepth++
        } else if (ch === ')') {
          parenDepth--
        } else if (ch === ',' && parenDepth === 1) {
          paramCount++
        } else if (parenDepth === 1 && ch.trim() && ch !== '(' && ch !== ')' && !hasParams) {
          hasParams = true
          paramCount = 1
        }
        pos++
      }

      // Validate parameter count
      const params = fn.parameters ?? []
      const requiredParams = params.filter(p => !p.optional).length
      const totalParams = params.length

      if (paramCount < requiredParams) {
        diagnostics.push({
          from: startPos,
          to: startPos + functionName.length,
          severity: 'error',
          message: `Function '${functionName}' requires ${requiredParams} parameter(s), but got ${paramCount}`,
        })
      } else if (paramCount > totalParams) {
        diagnostics.push({
          from: startPos,
          to: startPos + functionName.length,
          severity: 'error',
          message: `Function '${functionName}' accepts at most ${totalParams} parameter(s), but got ${paramCount}`,
        })
      }
    }

    return diagnostics
  })
}

/**
 * Create hover tooltip extension that shows documentation on hover
 */
function createHoverTooltips(def: ScriptLanguageDefinition): Extension {
  // Build lookup maps for quick access
  const functionMap = new Map<string, ScriptBuiltinFunction>()
  const variableMap = new Map<string, ScriptBuiltinVariable>()

  for (const fn of def.builtinFunctions) {
    functionMap.set(fn.name, fn)
  }

  for (const v of def.builtinVariables ?? []) {
    variableMap.set(v.name, v)
  }

  return hoverTooltip((view, pos) => {
    const { from, to } = view.state.doc.lineAt(pos)
    let start = pos
    let end = pos

    // Find word boundaries
    while (start > from) {
      const ch = view.state.doc.sliceString(start - 1, start)
      if (!/[\w.]/.test(ch)) break
      start--
    }

    while (end < to) {
      const ch = view.state.doc.sliceString(end, end + 1)
      if (!/[\w.]/.test(ch)) break
      end++
    }

    if (start === end) return null

    const word = view.state.doc.sliceString(start, end)

    // Check if it's a function
    const fn = functionMap.get(word)
    if (fn) {
      const params = fn.parameters ?? []
      const paramSignature = params
        .map(p => `${p.name}${p.optional ? '?' : ''}: ${p.type}`)
        .join(', ')

      let content = `**${fn.name}**(${paramSignature})`
      if (fn.returnType) {
        content += ` → ${fn.returnType}`
      }
      if (fn.description) {
        content += `\n\n${fn.description}`
      }
      if (params.length > 0) {
        content += '\n\n**Parameters:**'
        for (const p of params) {
          content += `\n• \`${p.name}\`: ${p.type}${p.optional ? ' (optional)' : ''}`
          if (p.description) {
            content += ` - ${p.description}`
          }
        }
      }

      return {
        pos: start,
        end,
        above: true,
        create() {
          const dom = document.createElement('div')
          dom.className = 'cm-tooltip-hover'
          dom.style.cssText = `
            max-width: 400px;
            padding: 8px 12px;
            background: var(--klinecharts-background-color, #1e222d);
            border: 1px solid var(--klinecharts-separator-color, #2a2e39);
            border-radius: 4px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 12px;
            line-height: 1.5;
            color: var(--klinecharts-text-color, #d1d4dc);
          `
          dom.innerHTML = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.+?)`/g, '<code style="background: rgba(255,255,255,0.1); padding: 1px 4px; border-radius: 2px;">$1</code>')
            .replace(/\n/g, '<br>')
          return { dom }
        },
      }
    }

    // Check if it's a variable
    const variable = variableMap.get(word)
    if (variable) {
      let content = `**${variable.name}**`
      if (variable.type) {
        content += `: ${variable.type}`
      }
      if (variable.description) {
        content += `\n\n${variable.description}`
      }

      return {
        pos: start,
        end,
        above: true,
        create() {
          const dom = document.createElement('div')
          dom.className = 'cm-tooltip-hover'
          dom.style.cssText = `
            max-width: 400px;
            padding: 8px 12px;
            background: var(--klinecharts-background-color, #1e222d);
            border: 1px solid var(--klinecharts-separator-color, #2a2e39);
            border-radius: 4px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 12px;
            line-height: 1.5;
            color: var(--klinecharts-text-color, #d1d4dc);
          `
          dom.innerHTML = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>')
          return { dom }
        },
      }
    }

    return null
  })
}

/**
 * Light theme highlight style for script languages (TradingView Pine Script style)
 */
const lightHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: '#2962ff' }, // blue for keywords
  { tag: tags.typeName, color: '#2962ff' }, // blue for types
  { tag: tags.function(tags.variableName), color: '#2962ff' }, // blue for functions
  { tag: tags.variableName, color: '#3b3b3b' }, // dark gray for regular variables
  { tag: tags.special(tags.variableName), color: '#e53935' }, // red for builtin variables
  { tag: tags.string, color: '#26a69a' }, // green for strings
  { tag: tags.number, color: '#ff6f00' }, // orange for numbers
  { tag: tags.comment, color: '#7f848e', fontStyle: 'italic' },
  { tag: tags.lineComment, color: '#7f848e', fontStyle: 'italic' },
  { tag: tags.blockComment, color: '#7f848e', fontStyle: 'italic' },
  { tag: tags.operator, color: '#3b3b3b' }, // dark gray for operators
  { tag: tags.meta, color: '#7f848e' },
  { tag: tags.punctuation, color: '#3b3b3b' }, // dark gray for braces/brackets
  { tag: tags.paren, color: '#3b3b3b' }, // dark gray for parentheses
  { tag: tags.brace, color: '#3b3b3b' }, // dark gray for braces
  { tag: tags.bracket, color: '#3b3b3b' }, // dark gray for brackets
])

/**
 * Dark theme highlight style for script languages (TradingView Pine Script style)
 */
const darkHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: '#2962ff' }, // blue for keywords
  { tag: tags.typeName, color: '#2962ff' }, // blue for types
  { tag: tags.function(tags.variableName), color: '#2962ff' }, // blue for functions
  { tag: tags.variableName, color: '#d1d4dc' }, // light gray for regular variables
  { tag: tags.special(tags.variableName), color: '#e53935' }, // red for builtin variables
  { tag: tags.string, color: '#26a69a' }, // green for strings
  { tag: tags.number, color: '#ff6f00' }, // orange for numbers
  { tag: tags.comment, color: '#7f848e', fontStyle: 'italic' },
  { tag: tags.lineComment, color: '#7f848e', fontStyle: 'italic' },
  { tag: tags.blockComment, color: '#7f848e', fontStyle: 'italic' },
  { tag: tags.operator, color: '#d1d4dc' }, // light gray for operators
  { tag: tags.meta, color: '#7f848e' },
  { tag: tags.punctuation, color: '#d1d4dc' }, // light gray for braces/brackets
  { tag: tags.paren, color: '#d1d4dc' }, // light gray for parentheses
  { tag: tags.brace, color: '#d1d4dc' }, // light gray for braces
  { tag: tags.bracket, color: '#d1d4dc' }, // light gray for brackets
])

/**
 * Create CodeMirror extensions from a ScriptLanguageDefinition.
 *
 * Enhanced features:
 * - Syntax highlighting for keywords, functions, variables, etc.
 * - Smart autocompletion with snippet support (parameter placeholders)
 * - Hover tooltips showing function signatures and documentation
 * - Real-time linting for unknown functions and invalid parameter counts
 *
 * @param def - The language definition to translate
 * @param theme - Theme to use for syntax highlighting ('light' or 'dark', defaults to 'dark')
 * @returns Array of CodeMirror extensions (language support + autocompletion + hover tooltips + linting + highlighting)
 */
export function createLanguageExtension(def: ScriptLanguageDefinition, theme: 'light' | 'dark' = 'dark'): Extension[] {
  const lang = createStreamLanguage(def)
  const langSupport = new LanguageSupport(lang)
  const highlightStyle = theme === 'light' ? lightHighlightStyle : darkHighlightStyle

  return [
    langSupport,
    createAutocompletion(def),
    createHoverTooltips(def),
    createScriptLinter(def),
    syntaxHighlighting(highlightStyle),
  ]
}

export default createLanguageExtension
