/**
 * Language Adapter - Translates ScriptLanguageDefinition to CodeMirror 6 extensions
 */

import { StreamLanguage } from '@codemirror/language'
import { LanguageSupport } from '@codemirror/language'
import { autocompletion, type CompletionContext, type Completion } from '@codemirror/autocomplete'
import { tags } from '@lezer/highlight'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import type { Extension } from '@codemirror/state'

import type { ScriptLanguageDefinition } from '../../types/script'

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

  // Add built-in functions
  for (const fn of def.builtinFunctions) {
    const params = fn.parameters
      ?.map(p => `${p.name}: ${p.type}`)
      .join(', ') ?? ''
    completions.push({
      label: fn.name,
      type: 'function',
      detail: fn.returnType ? `(${params}) -> ${fn.returnType}` : `(${params})`,
      info: fn.description,
      apply: fn.parameters?.length
        ? `${fn.name}()`
        : fn.name,
    })
  }

  // Add built-in variables
  for (const v of def.builtinVariables ?? []) {
    completions.push({
      label: v.name,
      type: 'variable',
      detail: v.type,
      info: v.description,
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

  return autocompletion({ override: [completeLanguage] })
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
 * @param def - The language definition to translate
 * @returns Array of CodeMirror extensions (language support + autocompletion + highlighting)
 */
export function createLanguageExtension(def: ScriptLanguageDefinition): Extension[] {
  const lang = createStreamLanguage(def)
  const langSupport = new LanguageSupport(lang)

  return [
    langSupport,
    createAutocompletion(def),
    syntaxHighlighting(defaultHighlightStyle),
  ]
}

export default createLanguageExtension
