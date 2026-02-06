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

import type { ScriptLanguageDefinition, ScriptBuiltinFunction, ScriptBuiltinVariable } from '../../types/script'

/**
 * Create a CodeMirror StreamLanguage mode from a ScriptLanguageDefinition
 */
function createStreamLanguage(def: ScriptLanguageDefinition) {
  const keywordSet = new Set(def.keywords)
  const typeKeywordSet = new Set(def.typeKeywords ?? [])
  const builtinFunctionSet = new Set(def.builtinFunctions.map(f => f.name))
  const builtinVariableSet = new Set((def.builtinVariables ?? []).map(v => v.name))
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
      if (stream.match(/^[a-zA-Z_]\w*(?:\.\w+)*/)) {
        const word = stream.current()

        // Check dotted names (e.g., syminfo.ticker, strategy.entry)
        if (builtinVariableSet.has(word)) return 'variableName.special'
        if (builtinFunctionSet.has(word)) return 'function'
        if (keywordSet.has(word)) return 'keyword'
        if (typeKeywordSet.has(word)) return 'typeName'

        // Check base name for dotted identifiers
        const baseName = word.split('.')[0]
        if (builtinVariableSet.has(baseName) || builtinFunctionSet.has(baseName)) {
          return 'variableName.special'
        }

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
 * Default highlight style for script languages
 */
const defaultHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: '#c678dd' },
  { tag: tags.typeName, color: '#e5c07b' },
  { tag: tags.function(tags.variableName), color: '#61afef' },
  { tag: tags.variableName, color: '#e06c75' },
  { tag: tags.string, color: '#98c379' },
  { tag: tags.number, color: '#d19a66' },
  { tag: tags.comment, color: '#7f848e', fontStyle: 'italic' },
  { tag: tags.lineComment, color: '#7f848e', fontStyle: 'italic' },
  { tag: tags.blockComment, color: '#7f848e', fontStyle: 'italic' },
  { tag: tags.operator, color: '#56b6c2' },
  { tag: tags.meta, color: '#7f848e' },
  { tag: tags.punctuation, color: '#abb2bf' },
])

/**
 * Create CodeMirror extensions from a ScriptLanguageDefinition.
 *
 * Enhanced features:
 * - Syntax highlighting for keywords, functions, variables, etc.
 * - Smart autocompletion with snippet support (parameter placeholders)
 * - Hover tooltips showing function signatures and documentation
 *
 * @param def - The language definition to translate
 * @returns Array of CodeMirror extensions (language support + autocompletion + hover tooltips + highlighting)
 */
export function createLanguageExtension(def: ScriptLanguageDefinition): Extension[] {
  const lang = createStreamLanguage(def)
  const langSupport = new LanguageSupport(lang)

  return [
    langSupport,
    createAutocompletion(def),
    createHoverTooltips(def),
    syntaxHighlighting(defaultHighlightStyle),
  ]
}

export default createLanguageExtension
