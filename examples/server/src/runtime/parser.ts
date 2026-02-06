/**
 * Simple Pine Script Parser
 * Parses a subset of Pine Script syntax for indicator creation
 */

import type { IndicatorMetadata, IndicatorPlot, IndicatorSetting, ScriptDiagnostic } from '../types.js'

export interface ParsedScript {
  success: boolean
  metadata?: IndicatorMetadata
  code: string
  errors: ScriptDiagnostic[]
  warnings: ScriptDiagnostic[]
  inputs: Map<string, { type: string; defaultValue: unknown }>
  plots: Map<string, { type: string; config: Record<string, unknown> }>
}

export class PineScriptParser {
  private errors: ScriptDiagnostic[] = []
  private warnings: ScriptDiagnostic[] = []

  parse(code: string): ParsedScript {
    this.errors = []
    this.warnings = []

    const lines = code.split('\n')
    const inputs = new Map<string, { type: string; defaultValue: unknown }>()
    const plots = new Map<string, { type: string; config: Record<string, unknown> }>()

    let indicatorName = 'Custom Indicator'
    let shortName = 'CI'
    let paneId = 'custom'
    let precision = 2

    // Parse indicator declaration
    const indicatorMatch = code.match(/indicator\s*\(\s*["']([^"']+)["']/i)
    if (indicatorMatch) {
      indicatorName = indicatorMatch[1]
      shortName = indicatorName.substring(0, 10)

      // Check for overlay parameter
      const overlayMatch = code.match(/overlay\s*=\s*(true|false)/i)
      if (overlayMatch && overlayMatch[1] === 'true') {
        paneId = 'candle_pane'
      } else {
        paneId = indicatorName.toLowerCase().replace(/\s+/g, '_')
      }
    }

    // Parse input declarations
    const inputRegex = /(\w+)\s*=\s*input(?:\.(\w+))?\s*\(([^)]+)\)/gi
    let match
    while ((match = inputRegex.exec(code)) !== null) {
      const varName = match[1]
      const inputType = match[2] || 'int'
      const params = match[3]

      // Extract default value
      let defaultValue: unknown = 14
      const defaultMatch = params.match(/(?:defval\s*=\s*|^)\s*([^,]+)/)
      if (defaultMatch) {
        const val = defaultMatch[1].trim()
        if (inputType === 'bool') {
          defaultValue = val === 'true'
        } else if (inputType === 'string') {
          defaultValue = val.replace(/["']/g, '')
        } else {
          defaultValue = parseFloat(val) || 14
        }
      }

      inputs.set(varName, { type: inputType, defaultValue })
    }

    // Parse plot statements
    const plotRegex = /plot\s*\(([^,)]+)(?:,([^)]+))?\)/gi
    while ((match = plotRegex.exec(code)) !== null) {
      const series = match[1].trim()
      const params = match[2] || ''

      const config: Record<string, unknown> = {
        series,
        title: series,
        color: '#2196F3',
        linewidth: 1,
      }

      // Parse parameters
      const titleMatch = params.match(/title\s*=\s*["']([^"']+)["']/)
      if (titleMatch) config.title = titleMatch[1]

      const colorMatch = params.match(/color\s*=\s*(?:color\.)?(\w+|#[0-9a-f]+)/i)
      if (colorMatch) config.color = colorMatch[1]

      const linewidthMatch = params.match(/linewidth\s*=\s*(\d+)/)
      if (linewidthMatch) config.linewidth = parseInt(linewidthMatch[1])

      plots.set(series, { type: 'plot', config })
    }

    // Parse hline statements
    const hlineRegex = /hline\s*\(([^,)]+)(?:,([^)]+))?\)/gi
    while ((match = hlineRegex.exec(code)) !== null) {
      const price = parseFloat(match[1].trim())
      const params = match[2] || ''

      const config: Record<string, unknown> = {
        price,
        title: `Level ${price}`,
        color: '#888888',
        linestyle: 'dashed',
      }

      const titleMatch = params.match(/title\s*=\s*["']([^"']+)["']/)
      if (titleMatch) config.title = titleMatch[1]

      const colorMatch = params.match(/color\s*=\s*(?:color\.)?(\w+|#[0-9a-f]+)/i)
      if (colorMatch) config.color = colorMatch[1]

      plots.set(`hline_${price}`, { type: 'hline', config })
    }

    // Build metadata
    const metadata: IndicatorMetadata = {
      shortName,
      precision,
      paneId,
      plots: this.buildPlots(plots),
      settings: this.buildSettings(inputs),
    }

    return {
      success: this.errors.length === 0,
      metadata,
      code,
      errors: this.errors,
      warnings: this.warnings,
      inputs,
      plots,
    }
  }

  private buildPlots(plots: Map<string, { type: string; config: Record<string, unknown> }>): IndicatorPlot[] {
    const result: IndicatorPlot[] = []

    for (const [id, { type, config }] of plots.entries()) {
      if (type === 'plot') {
        result.push({
          type: 'plot',
          id,
          title: config.title as string || id,
          color: config.color as string,
          linewidth: config.linewidth as number,
        })
      } else if (type === 'hline') {
        result.push({
          type: 'hline',
          price: config.price as number,
          title: config.title as string,
          color: config.color as string,
          linestyle: config.linestyle as 'solid' | 'dashed' | 'dotted',
        })
      }
    }

    return result
  }

  private buildSettings(inputs: Map<string, { type: string; defaultValue: unknown }>): IndicatorSetting[] {
    const result: IndicatorSetting[] = []

    for (const [key, { type, defaultValue }] of inputs.entries()) {
      const setting: IndicatorSetting = {
        key,
        type: type === 'bool' ? 'boolean' : type === 'string' ? 'string' : 'number',
        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
        defaultValue: defaultValue as string | number | boolean,
      }

      if (setting.type === 'number') {
        setting.min = 1
        setting.max = 500
        setting.step = 1
      }

      result.push(setting)
    }

    return result
  }

  private addError(line: number, column: number, message: string) {
    this.errors.push({ line, column, message, severity: 'error' })
  }

  private addWarning(line: number, column: number, message: string) {
    this.warnings.push({ line, column, message, severity: 'warning' })
  }
}
