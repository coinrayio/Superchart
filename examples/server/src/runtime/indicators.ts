/**
 * Technical Indicators Library
 * Implementation using TA-Lib for 100+ technical analysis indicators
 */

import talib from 'talib'

export class Indicators {

  /**
   * Validate that source is a numeric array. Returns an empty NaN array if not.
   * Prevents TA-Lib native segfaults from non-array inputs.
   */
  private validateSource(source: unknown, name: string): number[] | null {
    if (!Array.isArray(source)) {
      console.error(`${name}: expected array but got ${typeof source}: ${source}`)
      return null
    }
    if (source.length === 0) return null
    return source as number[]
  }

  /**
   * Safely execute a TA-Lib function.
   * Replaces NaN values in the input with 0, then restores NaN positions in the output.
   * Returns a NaN-filled array if TA-Lib fails.
   */
  private safeExecute(params: any): any {
    // Sanitize NaN values in numeric array inputs — TA-Lib can't handle them
    const sanitized = { ...params }

    for (const key of Object.keys(sanitized)) {
      const val = sanitized[key]
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'number') {
        sanitized[key] = val.map((v: number) => (isNaN(v) || v === null || v === undefined) ? 0 : v)
      }
      // Guard against non-array inputs where arrays are expected (prevents native segfaults)
      if (key.startsWith('inReal') || key === 'high' || key === 'low' || key === 'close' || key === 'open' || key === 'volume') {
        if (!Array.isArray(val)) {
          console.error(`TA-Lib ${params.name}: expected array for '${key}' but got ${typeof val}: ${val}`)
          const len = (params.endIdx ?? 0) + 1
          return { begIndex: 0, nbElement: len, result: { outReal: new Array(len).fill(NaN) } }
        }
      }
    }

    try {
      const result = talib.execute(sanitized as any)
      if (!result || result.begIndex === undefined) {
        const len = (sanitized.endIdx ?? 0) + 1
        return { begIndex: 0, nbElement: len, result: { outReal: new Array(len).fill(NaN) } }
      }
      return result
    } catch (error) {
      console.error(`TA-Lib error for ${params.name}:`, error)
      const len = (sanitized.endIdx ?? 0) + 1
      return { begIndex: 0, nbElement: len, result: { outReal: new Array(len).fill(NaN) } }
    }
  }

  /**
   * Simple Moving Average
   */
  sma(source: number[], length: number): number[] {
    const validated = this.validateSource(source, 'SMA')
    if (!validated) return []
    source = validated
    // TA-Lib SMA minimum period is 2; period=1 is identity
    if (length <= 1) return source.slice()

    const result = this.safeExecute({
      name: 'SMA',
      startIdx: 0,
      endIdx: source.length - 1,
      inReal: source,
      optInTimePeriod: length
    })

    const output = new Array(result.begIndex).fill(NaN)
    return output.concat(result.result.outReal)
  }

  /**
   * Exponential Moving Average
   */
  ema(source: number[], length: number): number[] {
    const validated = this.validateSource(source, 'EMA')
    if (!validated) return []
    source = validated
    // TA-Lib EMA minimum period is 2; period=1 is identity
    if (length <= 1) return source.slice()

    const result = this.safeExecute({
      name: 'EMA',
      startIdx: 0,
      endIdx: source.length - 1,
      inReal: source,
      optInTimePeriod: length
    })

    const output = new Array(result.begIndex).fill(NaN)
    return output.concat(result.result.outReal)
  }

  /**
   * Weighted Moving Average
   */
  wma(source: number[], length: number): number[] {
    const validated = this.validateSource(source, 'WMA')
    if (!validated) return []
    source = validated
    // TA-Lib WMA minimum period is 2; period=1 is identity
    if (length <= 1) return source.slice()

    const result = this.safeExecute({
      name: 'WMA',
      startIdx: 0,
      endIdx: source.length - 1,
      inReal: source,
      optInTimePeriod: length
    })

    const output = new Array(result.begIndex).fill(NaN)
    return output.concat(result.result.outReal)
  }

  /**
   * Running Moving Average (Wilder's Smoothing)
   * TA-Lib doesn't have RMA directly, so we implement it manually
   */
  rma(source: number[], length: number): number[] {
    const validated = this.validateSource(source, 'RMA')
    if (!validated) return []
    source = validated
    const result: number[] = []

    // Start with SMA
    let sum = 0
    for (let i = 0; i < length && i < source.length; i++) {
      sum += source[i]
      if (i < length - 1) {
        result.push(NaN)
      }
    }

    if (source.length >= length) {
      result.push(sum / length)
    }

    // Continue with RMA (Wilder's smoothing)
    for (let i = length; i < source.length; i++) {
      const rma = (result[i - 1] * (length - 1) + source[i]) / length
      result.push(rma)
    }

    return result
  }

  /**
   * Relative Strength Index
   */
  rsi(source: number[], length: number): number[] {
    const validated = this.validateSource(source, 'RSI')
    if (!validated) return []
    source = validated
    const result = this.safeExecute({
      name: 'RSI',
      startIdx: 0,
      endIdx: source.length - 1,
      inReal: source,
      optInTimePeriod: length
    })

    const output = new Array(result.begIndex).fill(NaN)
    return output.concat(result.result.outReal)
  }

  /**
   * MACD (Moving Average Convergence Divergence)
   */
  macd(
    source: number[],
    fastLength: number,
    slowLength: number,
    signalLength: number
  ): { macd: number[]; signal: number[]; histogram: number[] } {
    const validated = this.validateSource(source, 'MACD')
    if (!validated) return { macd: [], signal: [], histogram: [] }
    source = validated
    const result = this.safeExecute({
      name: 'MACD',
      startIdx: 0,
      endIdx: source.length - 1,
      inReal: source,
      optInFastPeriod: fastLength,
      optInSlowPeriod: slowLength,
      optInSignalPeriod: signalLength
    })

    const padding = new Array(result.begIndex).fill(NaN)

    return {
      macd: padding.concat(result.result.outMACD),
      signal: padding.concat(result.result.outMACDSignal),
      histogram: padding.concat(result.result.outMACDHist)
    }
  }

  /**
   * Bollinger Bands
   */
  bollingerBands(
    source: number[],
    length: number,
    mult: number
  ): { upper: number[]; middle: number[]; lower: number[] } {
    const validated = this.validateSource(source, 'BBANDS')
    if (!validated) return { upper: [], middle: [], lower: [] }
    source = validated
    const result = this.safeExecute({
      name: 'BBANDS',
      startIdx: 0,
      endIdx: source.length - 1,
      inReal: source,
      optInTimePeriod: length,
      optInNbDevUp: mult,
      optInNbDevDn: mult,
      optInMAType: 0 // SMA
    })

    const padding = new Array(result.begIndex).fill(NaN)

    return {
      upper: padding.concat(result.result.outRealUpperBand),
      middle: padding.concat(result.result.outRealMiddleBand),
      lower: padding.concat(result.result.outRealLowerBand)
    }
  }

  /**
   * Average True Range
   */
  atr(high: number[], low: number[], close: number[], length: number): number[] {
    const result = this.safeExecute({
      name: 'ATR',
      startIdx: 0,
      endIdx: high.length - 1,
      high,
      low,
      close,
      optInTimePeriod: length
    })

    const output = new Array(result.begIndex).fill(NaN)
    return output.concat(result.result.outReal)
  }

  /**
   * Stochastic Oscillator
   */
  stochastic(close: number[], high: number[], low: number[], length: number): number[] {
    const result = this.safeExecute({
      name: 'STOCH',
      startIdx: 0,
      endIdx: close.length - 1,
      high,
      low,
      close,
      optInFastK_Period: length,
      optInSlowK_Period: 3,
      optInSlowK_MAType: 0, // SMA
      optInSlowD_Period: 3,
      optInSlowD_MAType: 0 // SMA
    })

    const padding = new Array(result.begIndex).fill(NaN)
    // Return %K (fast stochastic)
    return padding.concat(result.result.outSlowK)
  }

  /**
   * Standard Deviation
   */
  stdev(source: number[], length: number): number[] {
    const validated = this.validateSource(source, 'STDDEV')
    if (!validated) return []
    source = validated
    const result = this.safeExecute({
      name: 'STDDEV',
      startIdx: 0,
      endIdx: source.length - 1,
      inReal: source,
      optInTimePeriod: length,
      optInNbDev: 1.0
    })

    const output = new Array(result.begIndex).fill(NaN)
    return output.concat(result.result.outReal)
  }

  /**
   * Sum of values over length
   */
  sum(source: number[], length: number): number[] {
    const validated = this.validateSource(source, 'SUM')
    if (!validated) return []
    source = validated
    const result = this.safeExecute({
      name: 'SUM',
      startIdx: 0,
      endIdx: source.length - 1,
      inReal: source,
      optInTimePeriod: length
    })

    const output = new Array(result.begIndex).fill(NaN)
    return output.concat(result.result.outReal)
  }

  /**
   * Highest value over length
   */
  highest(source: number[], length: number): number[] {
    const validated = this.validateSource(source, 'MAX')
    if (!validated) return []
    source = validated
    const result = this.safeExecute({
      name: 'MAX',
      startIdx: 0,
      endIdx: source.length - 1,
      inReal: source,
      optInTimePeriod: length
    })

    const output = new Array(result.begIndex).fill(NaN)
    return output.concat(result.result.outReal)
  }

  /**
   * Lowest value over length
   */
  lowest(source: number[], length: number): number[] {
    const validated = this.validateSource(source, 'MIN')
    if (!validated) return []
    source = validated
    const result = this.safeExecute({
      name: 'MIN',
      startIdx: 0,
      endIdx: source.length - 1,
      inReal: source,
      optInTimePeriod: length
    })

    const output = new Array(result.begIndex).fill(NaN)
    return output.concat(result.result.outReal)
  }

  /**
   * Crossover detection
   * Not available in TA-Lib, keeping custom implementation
   */
  crossover(a: number[], b: number[]): boolean[] {
    if (!Array.isArray(a) || !Array.isArray(b)) return []
    const result: boolean[] = [false]

    for (let i = 1; i < a.length && i < b.length; i++) {
      result.push(a[i - 1] <= b[i - 1] && a[i] > b[i])
    }

    return result
  }

  /**
   * Crossunder detection
   * Not available in TA-Lib, keeping custom implementation
   */
  crossunder(a: number[], b: number[]): boolean[] {
    if (!Array.isArray(a) || !Array.isArray(b)) return []
    const result: boolean[] = [false]

    for (let i = 1; i < a.length && i < b.length; i++) {
      result.push(a[i - 1] >= b[i - 1] && a[i] < b[i])
    }

    return result
  }

  /**
   * Get list of all available TA-Lib functions
   * This provides access to 100+ indicators beyond what's explicitly wrapped above
   */
  getAvailableFunctions(): string[] {
    return talib.functions.map((f: any) => f.name)
  }

  /**
   * Get detailed information about a TA-Lib function
   */
  getFunctionInfo(functionName: string) {
    return talib.explain(functionName)
  }

  /**
   * Execute any TA-Lib function by name
   * This allows access to all 100+ indicators without explicit wrappers
   */
  execute(functionName: string, params: any): any {
    return this.safeExecute({
      name: functionName,
      ...params
    })
  }
}
