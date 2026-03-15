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
  inputs: Map<string, { type: string; defaultValue: unknown; title?: string; min?: number; max?: number; step?: number }>
  plots: Map<string, { type: string; config: Record<string, unknown> }>
}

export class PineScriptParser {
  private errors: ScriptDiagnostic[] = []
  private warnings: ScriptDiagnostic[] = []

  parse(code: string): ParsedScript {
    this.errors = []
    this.warnings = []

    const lines = code.split('\n')
    const inputs = new Map<string, { type: string; defaultValue: unknown; title?: string; min?: number; max?: number; step?: number }>()
    const plots = new Map<string, { type: string; config: Record<string, unknown> }>()

    let indicatorName = 'Custom Indicator'
    let shortName = 'CI'
    let paneId = 'custom'
    let precision = 2

    // Parse indicator declaration (v6 style with title= parameter)
    const indicatorMatch = code.match(/indicator\s*\(\s*(?:title\s*=\s*)?["']([^"']+)["']/i)
    if (indicatorMatch) {
      indicatorName = indicatorMatch[1]
      shortName = indicatorName.substring(0, 10)

      // Check for shorttitle parameter
      const shortTitleMatch = code.match(/shorttitle\s*=\s*["']([^"']+)["']/i)
      if (shortTitleMatch) {
        shortName = shortTitleMatch[1]
      }

      // Check for overlay parameter
      const overlayMatch = code.match(/overlay\s*=\s*(true|false)/i)
      if (overlayMatch && overlayMatch[1] === 'true') {
        paneId = 'candle_pane'
      } else {
        paneId = indicatorName.toLowerCase().replace(/\s+/g, '_')
      }

      // Check for precision parameter
      const precisionMatch = code.match(/precision\s*=\s*(\d+)/i)
      if (precisionMatch) {
        precision = parseInt(precisionMatch[1])
      }
    }

    // Support study() declaration (Pine v4)
    const studyMatch = code.match(/study\s*\(\s*(?:title\s*=\s*)?["']([^"']+)["']/i)
    if (studyMatch && !indicatorMatch) {
      indicatorName = studyMatch[1]
      shortName = indicatorName.substring(0, 10)

      const shortTitleMatch = code.match(/shorttitle\s*=\s*["']([^"']+)["']/i)
      if (shortTitleMatch) {
        shortName = shortTitleMatch[1]
      }

      const overlayMatch = code.match(/overlay\s*=\s*(true|false)/i)
      if (overlayMatch && overlayMatch[1] === 'true') {
        paneId = 'candle_pane'
      } else {
        paneId = indicatorName.toLowerCase().replace(/\s+/g, '_')
      }

      const precisionMatch = code.match(/precision\s*=\s*(\d+)/i)
      if (precisionMatch) {
        precision = parseInt(precisionMatch[1])
      }
    }

    // Also support strategy declaration
    const strategyMatch = code.match(/strategy\s*\(\s*(?:title\s*=\s*)?["']([^"']+)["']/i)
    if (strategyMatch && !indicatorMatch && !studyMatch) {
      indicatorName = strategyMatch[1]
      shortName = indicatorName.substring(0, 10)

      const overlayMatch = code.match(/overlay\s*=\s*(true|false)/i)
      if (overlayMatch && overlayMatch[1] === 'true') {
        paneId = 'candle_pane'
      } else {
        paneId = indicatorName.toLowerCase().replace(/\s+/g, '_')
      }
    }

    // Parse input declarations (supports input.int, input.float, input.bool, input.string, input.source, etc.)
    const inputRegex = /(\w+)\s*=\s*input(?:\.(\w+))?\s*\(([^)]*)\)/gi
    let match
    while ((match = inputRegex.exec(code)) !== null) {
      const varName = match[1]
      const inputType = match[2] || 'int'
      const params = match[3]

      // Extract default value (can be first parameter or defval=)
      let defaultValue: unknown = 14

      // Try to find defval parameter first
      const defvalMatch = params.match(/defval\s*=\s*([^,]+)/)
      if (defvalMatch) {
        const val = defvalMatch[1].trim()
        defaultValue = this.parseValue(val, inputType)
      } else {
        // If no defval, try first parameter
        const firstParamMatch = params.match(/^\s*([^,]+)/)
        if (firstParamMatch) {
          const val = firstParamMatch[1].trim()
          defaultValue = this.parseValue(val, inputType)
        }
      }

      // Extract title parameter for better UI
      const titleMatch = params.match(/title\s*=\s*["']([^"']+)["']/)
      const title = titleMatch ? titleMatch[1] : varName

      // Extract min/max/step for number inputs
      let min: number | undefined
      let max: number | undefined
      let step: number | undefined

      if (inputType === 'int' || inputType === 'float') {
        const minMatch = params.match(/minval\s*=\s*([^,]+)/)
        const maxMatch = params.match(/maxval\s*=\s*([^,]+)/)
        const stepMatch = params.match(/step\s*=\s*([^,]+)/)

        if (minMatch) min = parseFloat(minMatch[1].trim())
        if (maxMatch) max = parseFloat(maxMatch[1].trim())
        if (stepMatch) step = parseFloat(stepMatch[1].trim())
      }

      inputs.set(varName, {
        type: inputType,
        defaultValue,
        title,
        min,
        max,
        step
      })
    }

    // Build var → series mapping for plot assignments (e.g., upl=plot(up,...) → upl→up)
    const plotVarMap = new Map<string, string>()
    const plotAssignRegex = /(\w+)\s*=\s*plot\s*\(([^,)]+)/gi
    while ((match = plotAssignRegex.exec(code)) !== null) {
      plotVarMap.set(match[1].trim(), match[2].trim())
    }

    // Build color variable map (e.g., bullColor = color.green → bullColor → '#00FF00')
    const colorVarMap = new Map<string, string>()
    // Match simple color assignments: varName = color.name
    const colorAssignRegex = /(\w+)\s*=\s*color\.(\w+)\s*$/gm
    while ((match = colorAssignRegex.exec(code)) !== null) {
      const varName = match[1].trim()
      const colorName = match[2].trim()
      if (colorName !== 'new' && colorName !== 'rgb') {
        colorVarMap.set(varName, this.mapColorName(colorName))
      }
    }
    // Match color.new assignments: varName = color.new(color.name, transp)
    const colorNewRegex = /(\w+)\s*=\s*color\.new\s*\(\s*(?:color\.)?(\w+)\s*,\s*(\d+)\s*\)/gi
    while ((match = colorNewRegex.exec(code)) !== null) {
      const varName = match[1].trim()
      const baseColor = this.mapColorName(match[2].trim())
      const transp = parseInt(match[3])
      colorVarMap.set(varName, this.addTransparency(baseColor, transp))
    }
    // Match color.rgb assignments: varName = color.rgb(r, g, b, transp?)
    const colorRgbAssignRegex = /(\w+)\s*=\s*color\.rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(\d+))?\s*\)/gi
    while ((match = colorRgbAssignRegex.exec(code)) !== null) {
      const varName = match[1].trim()
      const [, , r, g, b, a] = match
      const alpha = a ? 1 - parseInt(a) / 100 : 1
      colorVarMap.set(varName, `rgba(${r}, ${g}, ${b}, ${alpha})`)
    }

    // Parse plot statements (supports multiple parameters)
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

      // Color can be color.rgb(), color.new(), #hex, color.name, variable ref, or ternary expression
      const colorRgbMatch = params.match(/color\s*=\s*color\.rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(\d+))?\s*\)/)
      if (colorRgbMatch) {
        const [, r, g, b, a] = colorRgbMatch
        const alpha = a ? parseInt(a) : 0
        config.color = `rgba(${r}, ${g}, ${b}, ${1 - alpha / 100})`
      } else {
        const colorMatch = params.match(/color\s*=\s*(?:color\.)?(\w+|#[0-9a-f]+)/i)
        if (colorMatch) {
          const colorValue = colorMatch[1]
          // Resolve color variable references, then map color names
          config.color = colorVarMap.get(colorValue) || this.mapColorName(colorValue)
        } else {
          // Handle ternary/parenthesized color expressions: color=(cond ? colorA : colorB)
          // Extract the first recognizable color variable from the expression
          const ternaryColorMatch = params.match(/color\s*=\s*\(?\s*\w+\s*\?\s*(?:color\.)?(\w+)\s*:/i)
          if (ternaryColorMatch) {
            const cval = ternaryColorMatch[1]
            // Resolve color, then strip transparency — for gapConnect, alpha only controls visibility
            const resolvedColor = colorVarMap.get(cval) || this.mapColorName(cval)
            config.color = this.makeOpaque(resolvedColor)
            config.gapConnect = true
          }
        }
      }

      const linewidthMatch = params.match(/linewidth\s*=\s*(\d+)/)
      if (linewidthMatch) config.linewidth = parseInt(linewidthMatch[1])

      // Parse style parameter
      const styleMatch = params.match(/style\s*=\s*(\w+)/)
      if (styleMatch) config.style = styleMatch[1]

      // Parse transp (transparency) parameter - deprecated in v5+ but still used
      const transpMatch = params.match(/transp\s*=\s*(\d+)/)
      if (transpMatch) config.transp = parseInt(transpMatch[1])

      plots.set(series, { type: 'plot', config })
    }

    // Parse hline statements
    const hlineRegex = /(\w+\s*=\s*)?hline\s*\(([^,)]+)(?:,([^)]+))?\)/gi
    while ((match = hlineRegex.exec(code)) !== null) {
      const varName = match[1] ? match[1].replace(/\s*=\s*$/, '').trim() : null
      const priceStr = match[2].trim()
      const params = match[3] || ''

      const price = parseFloat(priceStr)
      if (isNaN(price)) continue

      const config: Record<string, unknown> = {
        price,
        title: `Level ${price}`,
        color: '#888888',
        linestyle: 'solid',
      }

      const titleMatch = params.match(/title\s*=\s*["']([^"']+)["']/)
      if (titleMatch) config.title = titleMatch[1]

      const colorMatch = params.match(/color\s*=\s*(?:color\.)?(\w+|#[0-9a-f]+)/i)
      if (colorMatch) config.color = this.mapColorName(colorMatch[1])

      // Parse linestyle parameter
      const linestyleMatch = params.match(/linestyle\s*=\s*hline\.style_(\w+)/)
      if (linestyleMatch) config.linestyle = linestyleMatch[1]

      const plotId = varName || `hline_${price}`
      plots.set(plotId, { type: 'hline', config })
    }

    // Parse fill statements (fill between two plots/hlines)
    const fillRegex = /fill\s*\(([^,)]+)\s*,\s*([^,)]+)(?:,([^)]+))?\)/gi
    while ((match = fillRegex.exec(code)) !== null) {
      const plot1Ref = match[1].trim()
      const plot2Ref = match[2].trim()
      const params = match[3] || ''

      // Resolve variable references to plot series keys
      // e.g., fill(mabl, mbbl) → mabl was `plot(mab,...)` → plotKey1='mab'
      // For hlines: fill(h0, h1) → h0 IS a plot key in the plots map
      const plotKey1 = plotVarMap.get(plot1Ref) || plot1Ref
      const plotKey2 = plotVarMap.get(plot2Ref) || plot2Ref

      const config: Record<string, unknown> = {
        plot1: plotKey1,
        plot2: plotKey2,
        color: 'rgba(33, 150, 243, 0.1)',
        title: `Fill ${plot1Ref}/${plot2Ref}`,
      }

      const titleMatch = params.match(/title\s*=\s*["']([^"']+)["']/)
      if (titleMatch) config.title = titleMatch[1]

      const colorMatch = params.match(/color\s*=\s*color\.rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(\d+))?\s*\)/)
      if (colorMatch) {
        const [, r, g, b, a] = colorMatch
        const alpha = a ? 1 - parseInt(a) / 100 : 0.1
        config.color = `rgba(${r}, ${g}, ${b}, ${alpha})`
      } else {
        const simpleColorMatch = params.match(/color\s*=\s*color\.new\s*\(\s*([^,]+)\s*,\s*(\d+)\s*\)/)
        if (simpleColorMatch) {
          const baseColor = this.mapColorName(simpleColorMatch[1].trim())
          const transp = parseInt(simpleColorMatch[2])
          config.color = this.addTransparency(baseColor, transp)
        }
      }

      const transpMatch = params.match(/transp\s*=\s*(\d+)/)
      if (transpMatch) config.transp = parseInt(transpMatch[1])

      plots.set(`fill_${plotKey1}_${plotKey2}`, { type: 'fill', config })
    }

    // Parse plotshape statements (use sequential IDs for consistent matching with executor)
    let plotshapeIndex = 0
    const plotshapeRegex = /plotshape\s*\(([^,)]+)(?:,([^)]+))?\)/gi
    while ((match = plotshapeRegex.exec(code)) !== null) {
      const condition = match[1].trim()
      const params = match[2] || ''

      const config: Record<string, unknown> = {
        series: condition,
        title: 'Shape',
        style: 'xcross',
        location: 'abovebar',
        color: '#2196F3',
        size: 'small',
      }

      const titleMatch = params.match(/title\s*=\s*["']([^"']+)["']/)
      if (titleMatch) config.title = titleMatch[1]

      const styleMatch = params.match(/style\s*=\s*shape\.(\w+)/)
      if (styleMatch) config.style = styleMatch[1]

      const locationMatch = params.match(/location\s*=\s*location\.(\w+)/)
      if (locationMatch) config.location = locationMatch[1]

      const colorMatch = params.match(/color\s*=\s*(?:color\.)?(\w+|#[0-9a-f]+)/i)
      if (colorMatch) {
        const cval = colorMatch[1]
        config.color = colorVarMap.get(cval) || this.mapColorName(cval)
      }

      const sizeMatch = params.match(/size\s*=\s*size\.(\w+)/)
      if (sizeMatch) config.size = sizeMatch[1]

      const textMatch = params.match(/text\s*=\s*["']([^"']+)["']/)
      if (textMatch) config.text = textMatch[1]

      const textcolorMatch = params.match(/textcolor\s*=\s*(?:color\.)?(\w+|#[0-9a-f]+)/i)
      if (textcolorMatch) {
        const tcval = textcolorMatch[1]
        config.textcolor = colorVarMap.get(tcval) || this.mapColorName(tcval)
      }

      plots.set(`plotshape_${plotshapeIndex++}`, { type: 'plotshape', config })
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
          gapConnect: config.gapConnect as boolean | undefined,
        })
      } else if (type === 'hline') {
        result.push({
          type: 'hline',
          id,
          price: config.price as number,
          title: config.title as string,
          color: config.color as string,
          linestyle: config.linestyle as 'solid' | 'dashed' | 'dotted',
        })
      } else if (type === 'plotshape') {
        result.push({
          type: 'plotshape',
          id,
          series: config.series as string,
          title: config.title as string,
          style: config.style as string,
          location: config.location as string,
          color: config.color as string,
          size: config.size as string,
          text: config.text as string | undefined,
          textcolor: config.textcolor as string | undefined,
          linewidth: config.linewidth as number | undefined,
        })
      } else if (type === 'fill') {
        result.push({
          type: 'fill',
          id,
          plot1: config.plot1 as string,
          plot2: config.plot2 as string,
          color: config.color as string,
          transp: config.transp as number | undefined,
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

  private parseValue(val: string, inputType: string): unknown {
    const trimmedVal = val.trim()

    if (inputType === 'bool') {
      return trimmedVal === 'true'
    } else if (inputType === 'string' || inputType === 'source' || inputType === 'timeframe' || inputType === 'symbol') {
      return trimmedVal.replace(/["']/g, '')
    } else if (inputType === 'color') {
      return trimmedVal.replace(/["']/g, '')
    } else {
      // int or float
      const parsed = parseFloat(trimmedVal)
      if (isNaN(parsed)) {
        // Could be a variable reference (e.g., 'close', 'open', 'high', 'low')
        // Preserve as string for later resolution in the executor
        return trimmedVal
      }
      return parsed
    }
  }

  private mapColorName(colorName: string): string {
    // If it's already a hex color, return it
    if (colorName.startsWith('#')) {
      return colorName
    }

    // Map Pine Script color names to hex values
    const colorMap: Record<string, string> = {
      'red': '#FF0000',
      'green': '#00FF00',
      'blue': '#0000FF',
      'yellow': '#FFFF00',
      'white': '#FFFFFF',
      'black': '#000000',
      'orange': '#FFA500',
      'purple': '#800080',
      'aqua': '#00FFFF',
      'fuchsia': '#FF00FF',
      'gray': '#808080',
      'grey': '#808080',
      'lime': '#00FF00',
      'maroon': '#800000',
      'navy': '#000080',
      'olive': '#808000',
      'silver': '#C0C0C0',
      'teal': '#008080',
      // TradingView specific colors
      '2962FF': '#2962FF',
      'FF6D00': '#FF6D00',
      '787B86': '#787B86',
      '12bcc9': '#12BCC9',
      '8D1699': '#8D1699',
    }

    return colorMap[colorName.toLowerCase()] || colorMap[colorName] || '#2196F3'
  }

  private addTransparency(hexColor: string, transparency: number): string {
    // Convert hex to rgba with transparency
    // transparency is 0-100 in Pine Script (0 = opaque, 100 = transparent)
    const alpha = 1 - (transparency / 100)

    // Handle #RGB or #RRGGBB format
    let hex = hexColor.replace('#', '')
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
    }

    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)

    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  private makeOpaque(color: string): string {
    // Strip transparency from a color, returning it at full opacity
    if (color.startsWith('rgba(')) {
      return color.replace(/,\s*[\d.]+\)$/, ', 1)')
    }
    if (color.startsWith('#') && color.length === 9) {
      // #RRGGBBAA → #RRGGBB
      return color.substring(0, 7)
    }
    return color
  }

  private addError(line: number, column: number, message: string) {
    this.errors.push({ line, column, message, severity: 'error' })
  }

  private addWarning(line: number, column: number, message: string) {
    this.warnings.push({ line, column, message, severity: 'warning' })
  }
}
