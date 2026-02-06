/**
 * Pine Script Runtime Executor
 * Executes parsed Pine Script code on OHLCV data
 */

import type { Candle, IndicatorDataPoint, SettingValue } from '../types.js'
import type { ParsedScript } from './parser.js'
import { Indicators } from './indicators.js'

export class PineScriptExecutor {
  private indicators = new Indicators()

  execute(
    script: ParsedScript,
    candles: Candle[],
    settings?: Record<string, SettingValue>
  ): IndicatorDataPoint[] {
    // Create execution context
    const context = this.createContext(candles, script, settings || {})

    // Execute the script's logic
    const results = this.executeScript(script.code, context, candles)

    return results
  }

  private createContext(
    candles: Candle[],
    script: ParsedScript,
    settings: Record<string, SettingValue>
  ) {
    const context: Record<string, unknown> = {
      // Built-in variables
      open: candles.map(c => c.open),
      high: candles.map(c => c.high),
      low: candles.map(c => c.low),
      close: candles.map(c => c.close),
      volume: candles.map(c => c.volume),
      time: candles.map(c => c.timestamp),

      // Calculated series
      hl2: candles.map(c => (c.high + c.low) / 2),
      hlc3: candles.map(c => (c.high + c.low + c.close) / 3),
      ohlc4: candles.map(c => (c.open + c.high + c.low + c.close) / 4),

      // Input settings
      ...Object.fromEntries(
        Array.from(script.inputs.entries()).map(([key, { defaultValue }]) => [
          key,
          settings[key] ?? defaultValue,
        ])
      ),

      // Built-in functions
      // Convenience wrappers for common indicators
      sma: (source: number[], length: number) => this.indicators.sma(source, length),
      ema: (source: number[], length: number) => this.indicators.ema(source, length),
      wma: (source: number[], length: number) => this.indicators.wma(source, length),
      rma: (source: number[], length: number) => this.indicators.rma(source, length),
      rsi: (source: number[], length: number) => this.indicators.rsi(source, length),
      macd: (source: number[], fastLen: number, slowLen: number, signalLen: number) =>
        this.indicators.macd(source, fastLen, slowLen, signalLen),
      bb: (source: number[], length: number, mult: number) =>
        this.indicators.bollingerBands(source, length, mult),
      atr: (high: number[], low: number[], close: number[], length: number) =>
        this.indicators.atr(high, low, close, length),
      stoch: (close: number[], high: number[], low: number[], length: number) =>
        this.indicators.stochastic(close, high, low, length),
      stdev: (source: number[], length: number) => this.indicators.stdev(source, length),
      sum: (source: number[], length: number) => this.indicators.sum(source, length),
      highest: (source: number[], length: number) => this.indicators.highest(source, length),
      lowest: (source: number[], length: number) => this.indicators.lowest(source, length),
      crossover: (a: number[], b: number[]) => this.indicators.crossover(a, b),
      crossunder: (a: number[], b: number[]) => this.indicators.crossunder(a, b),

      // Math functions
      abs: Math.abs,
      max: Math.max,
      min: Math.min,
      pow: Math.pow,
      sqrt: Math.sqrt,
      log: Math.log,
      exp: Math.exp,
      round: Math.round,
      floor: Math.floor,
      ceil: Math.ceil,

      // TA-Lib Math Operators (11 functions)
      add: (params: any) => this.indicators.execute('ADD', params),
      div: (params: any) => this.indicators.execute('DIV', params),
      maxindex: (params: any) => this.indicators.execute('MAXINDEX', params),
      minindex: (params: any) => this.indicators.execute('MININDEX', params),
      minmax: (params: any) => this.indicators.execute('MINMAX', params),
      minmaxindex: (params: any) => this.indicators.execute('MINMAXINDEX', params),
      mult: (params: any) => this.indicators.execute('MULT', params),
      sub: (params: any) => this.indicators.execute('SUB', params),

      // TA-Lib Math Transform (15 functions)
      acos: (params: any) => this.indicators.execute('ACOS', params),
      asin: (params: any) => this.indicators.execute('ASIN', params),
      atan: (params: any) => this.indicators.execute('ATAN', params),
      cos: (params: any) => this.indicators.execute('COS', params),
      cosh: (params: any) => this.indicators.execute('COSH', params),
      ln: (params: any) => this.indicators.execute('LN', params),
      log10: (params: any) => this.indicators.execute('LOG10', params),
      sin: (params: any) => this.indicators.execute('SIN', params),
      sinh: (params: any) => this.indicators.execute('SINH', params),
      tan: (params: any) => this.indicators.execute('TAN', params),
      tanh: (params: any) => this.indicators.execute('TANH', params),

      // TA-Lib Overlap Studies
      accbands: (params: any) => this.indicators.execute('ACCBANDS', params),
      dema: (params: any) => this.indicators.execute('DEMA', params),
      ht_trendline: (params: any) => this.indicators.execute('HT_TRENDLINE', params),
      kama: (params: any) => this.indicators.execute('KAMA', params),
      ma: (params: any) => this.indicators.execute('MA', params),
      mama: (params: any) => this.indicators.execute('MAMA', params),
      mavp: (params: any) => this.indicators.execute('MAVP', params),
      midpoint: (params: any) => this.indicators.execute('MIDPOINT', params),
      midprice: (params: any) => this.indicators.execute('MIDPRICE', params),
      sar: (params: any) => this.indicators.execute('SAR', params),
      sarext: (params: any) => this.indicators.execute('SAREXT', params),
      t3: (params: any) => this.indicators.execute('T3', params),
      tema: (params: any) => this.indicators.execute('TEMA', params),
      trima: (params: any) => this.indicators.execute('TRIMA', params),

      // TA-Lib Volatility Indicators (3 functions)
      natr: (params: any) => this.indicators.execute('NATR', params),
      trange: (params: any) => this.indicators.execute('TRANGE', params),

      // TA-Lib Momentum Indicators (30 functions)
      adx: (params: any) => this.indicators.execute('ADX', params),
      adxr: (params: any) => this.indicators.execute('ADXR', params),
      apo: (params: any) => this.indicators.execute('APO', params),
      aroon: (params: any) => this.indicators.execute('AROON', params),
      aroonosc: (params: any) => this.indicators.execute('AROONOSC', params),
      bop: (params: any) => this.indicators.execute('BOP', params),
      cci: (params: any) => this.indicators.execute('CCI', params),
      cmo: (params: any) => this.indicators.execute('CMO', params),
      dx: (params: any) => this.indicators.execute('DX', params),
      imi: (params: any) => this.indicators.execute('IMI', params),
      macdext: (params: any) => this.indicators.execute('MACDEXT', params),
      macdfix: (params: any) => this.indicators.execute('MACDFIX', params),
      mfi: (params: any) => this.indicators.execute('MFI', params),
      minus_di: (params: any) => this.indicators.execute('MINUS_DI', params),
      minus_dm: (params: any) => this.indicators.execute('MINUS_DM', params),
      mom: (params: any) => this.indicators.execute('MOM', params),
      plus_di: (params: any) => this.indicators.execute('PLUS_DI', params),
      plus_dm: (params: any) => this.indicators.execute('PLUS_DM', params),
      ppo: (params: any) => this.indicators.execute('PPO', params),
      roc: (params: any) => this.indicators.execute('ROC', params),
      rocp: (params: any) => this.indicators.execute('ROCP', params),
      rocr: (params: any) => this.indicators.execute('ROCR', params),
      rocr100: (params: any) => this.indicators.execute('ROCR100', params),
      stochf: (params: any) => this.indicators.execute('STOCHF', params),
      stochrsi: (params: any) => this.indicators.execute('STOCHRSI', params),
      trix: (params: any) => this.indicators.execute('TRIX', params),
      ultosc: (params: any) => this.indicators.execute('ULTOSC', params),
      willr: (params: any) => this.indicators.execute('WILLR', params),

      // TA-Lib Cycle Indicators (5 functions)
      ht_dcperiod: (params: any) => this.indicators.execute('HT_DCPERIOD', params),
      ht_dcphase: (params: any) => this.indicators.execute('HT_DCPHASE', params),
      ht_phasor: (params: any) => this.indicators.execute('HT_PHASOR', params),
      ht_sine: (params: any) => this.indicators.execute('HT_SINE', params),
      ht_trendmode: (params: any) => this.indicators.execute('HT_TRENDMODE', params),

      // TA-Lib Volume Indicators (3 functions)
      ad: (params: any) => this.indicators.execute('AD', params),
      adosc: (params: any) => this.indicators.execute('ADOSC', params),
      obv: (params: any) => this.indicators.execute('OBV', params),

      // TA-Lib Pattern Recognition (61 functions)
      cdl2crows: (params: any) => this.indicators.execute('CDL2CROWS', params),
      cdl3blackcrows: (params: any) => this.indicators.execute('CDL3BLACKCROWS', params),
      cdl3inside: (params: any) => this.indicators.execute('CDL3INSIDE', params),
      cdl3linestrike: (params: any) => this.indicators.execute('CDL3LINESTRIKE', params),
      cdl3outside: (params: any) => this.indicators.execute('CDL3OUTSIDE', params),
      cdl3starsinsouth: (params: any) => this.indicators.execute('CDL3STARSINSOUTH', params),
      cdl3whitesoldiers: (params: any) => this.indicators.execute('CDL3WHITESOLDIERS', params),
      cdlabandonedbaby: (params: any) => this.indicators.execute('CDLABANDONEDBABY', params),
      cdladvanceblock: (params: any) => this.indicators.execute('CDLADVANCEBLOCK', params),
      cdlbelthold: (params: any) => this.indicators.execute('CDLBELTHOLD', params),
      cdlbreakaway: (params: any) => this.indicators.execute('CDLBREAKAWAY', params),
      cdlclosingmarubozu: (params: any) => this.indicators.execute('CDLCLOSINGMARUBOZU', params),
      cdlconcealbabyswall: (params: any) => this.indicators.execute('CDLCONCEALBABYSWALL', params),
      cdlcounterattack: (params: any) => this.indicators.execute('CDLCOUNTERATTACK', params),
      cdldarkcloudcover: (params: any) => this.indicators.execute('CDLDARKCLOUDCOVER', params),
      cdldoji: (params: any) => this.indicators.execute('CDLDOJI', params),
      cdldojistar: (params: any) => this.indicators.execute('CDLDOJISTAR', params),
      cdldragonflydoji: (params: any) => this.indicators.execute('CDLDRAGONFLYDOJI', params),
      cdlengulfing: (params: any) => this.indicators.execute('CDLENGULFING', params),
      cdleveningdojistar: (params: any) => this.indicators.execute('CDLEVENINGDOJISTAR', params),
      cdleveningstar: (params: any) => this.indicators.execute('CDLEVENINGSTAR', params),
      cdlgapsidesidewhite: (params: any) => this.indicators.execute('CDLGAPSIDESIDEWHITE', params),
      cdlgravestonedoji: (params: any) => this.indicators.execute('CDLGRAVESTONEDOJI', params),
      cdlhammer: (params: any) => this.indicators.execute('CDLHAMMER', params),
      cdlhangingman: (params: any) => this.indicators.execute('CDLHANGINGMAN', params),
      cdlharami: (params: any) => this.indicators.execute('CDLHARAMI', params),
      cdlharamicross: (params: any) => this.indicators.execute('CDLHARAMICROSS', params),
      cdlhighwave: (params: any) => this.indicators.execute('CDLHIGHWAVE', params),
      cdlhikkake: (params: any) => this.indicators.execute('CDLHIKKAKE', params),
      cdlhikkakemod: (params: any) => this.indicators.execute('CDLHIKKAKEMOD', params),
      cdlhomingpigeon: (params: any) => this.indicators.execute('CDLHOMINGPIGEON', params),
      cdlidentical3crows: (params: any) => this.indicators.execute('CDLIDENTICAL3CROWS', params),
      cdlinneck: (params: any) => this.indicators.execute('CDLINNECK', params),
      cdlinvertedhammer: (params: any) => this.indicators.execute('CDLINVERTEDHAMMER', params),
      cdlkicking: (params: any) => this.indicators.execute('CDLKICKING', params),
      cdlkickingbylength: (params: any) => this.indicators.execute('CDLKICKINGBYLENGTH', params),
      cdlladderbottom: (params: any) => this.indicators.execute('CDLLADDERBOTTOM', params),
      cdllongleggeddoji: (params: any) => this.indicators.execute('CDLLONGLEGGEDDOJI', params),
      cdllongline: (params: any) => this.indicators.execute('CDLLONGLINE', params),
      cdlmarubozu: (params: any) => this.indicators.execute('CDLMARUBOZU', params),
      cdlmatchinglow: (params: any) => this.indicators.execute('CDLMATCHINGLOW', params),
      cdlmathold: (params: any) => this.indicators.execute('CDLMATHOLD', params),
      cdlmorningdojistar: (params: any) => this.indicators.execute('CDLMORNINGDOJISTAR', params),
      cdlmorningstar: (params: any) => this.indicators.execute('CDLMORNINGSTAR', params),
      cdlonneck: (params: any) => this.indicators.execute('CDLONNECK', params),
      cdlpiercing: (params: any) => this.indicators.execute('CDLPIERCING', params),
      cdlrickshawman: (params: any) => this.indicators.execute('CDLRICKSHAWMAN', params),
      cdlrisefall3methods: (params: any) => this.indicators.execute('CDLRISEFALL3METHODS', params),
      cdlseparatinglines: (params: any) => this.indicators.execute('CDLSEPARATINGLINES', params),
      cdlshootingstar: (params: any) => this.indicators.execute('CDLSHOOTINGSTAR', params),
      cdlshortline: (params: any) => this.indicators.execute('CDLSHORTLINE', params),
      cdlspinningtop: (params: any) => this.indicators.execute('CDLSPINNINGTOP', params),
      cdlstalledpattern: (params: any) => this.indicators.execute('CDLSTALLEDPATTERN', params),
      cdlsticksandwich: (params: any) => this.indicators.execute('CDLSTICKSANDWICH', params),
      cdltakuri: (params: any) => this.indicators.execute('CDLTAKURI', params),
      cdltasukigap: (params: any) => this.indicators.execute('CDLTASUKIGAP', params),
      cdlthrusting: (params: any) => this.indicators.execute('CDLTHRUSTING', params),
      cdltristar: (params: any) => this.indicators.execute('CDLTRISTAR', params),
      cdlunique3river: (params: any) => this.indicators.execute('CDLUNIQUE3RIVER', params),
      cdlupsidegap2crows: (params: any) => this.indicators.execute('CDLUPSIDEGAP2CROWS', params),
      cdlxsidegap3methods: (params: any) => this.indicators.execute('CDLXSIDEGAP3METHODS', params),

      // TA-Lib Statistic Functions
      beta: (params: any) => this.indicators.execute('BETA', params),
      correl: (params: any) => this.indicators.execute('CORREL', params),
      linearreg: (params: any) => this.indicators.execute('LINEARREG', params),
      linearreg_angle: (params: any) => this.indicators.execute('LINEARREG_ANGLE', params),
      linearreg_intercept: (params: any) => this.indicators.execute('LINEARREG_INTERCEPT', params),
      linearreg_slope: (params: any) => this.indicators.execute('LINEARREG_SLOPE', params),
      tsf: (params: any) => this.indicators.execute('TSF', params),
      var: (params: any) => this.indicators.execute('VAR', params),

      // TA-Lib Price Transform (5 functions)
      avgprice: (params: any) => this.indicators.execute('AVGPRICE', params),
      avgdev: (params: any) => this.indicators.execute('AVGDEV', params),
      medprice: (params: any) => this.indicators.execute('MEDPRICE', params),
      typprice: (params: any) => this.indicators.execute('TYPPRICE', params),
      wclprice: (params: any) => this.indicators.execute('WCLPRICE', params),

      // Results storage
      _plots: new Map<string, number[]>(),
    }

    return context
  }

  private executeScript(
    code: string,
    context: Record<string, unknown>,
    candles: Candle[]
  ): IndicatorDataPoint[] {
    try {
      // Extract the calculation logic (everything after indicator declaration)
      const calculationCode = this.extractCalculationCode(code)

      // Create a function that executes the script logic
      const fn = new Function(...Object.keys(context), calculationCode)

      // Execute the function with the context
      fn(...Object.values(context))

      // Build data points from plot results
      const plots = context._plots as Map<string, number[]>
      return this.buildDataPoints(candles, plots)
    } catch (error: any) {
      console.error('Script execution error:', error)
      throw new Error(`Script execution failed: ${(error as Error).message}`)
    }
  }

  private extractCalculationCode(code: string): string {
    // Remove indicator declaration
    const withoutIndicator = code.replace(/indicator\s*\([^)]+\)/gi, '')

    // Extract variable assignments and plot calls
    const lines = withoutIndicator.split('\n')
    const processedLines: string[] = []

    for (const line of lines) {
      const trimmed = line.trim()

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('//')) continue

      // Transform plot calls to store results
      if (trimmed.startsWith('plot(')) {
        const plotMatch = trimmed.match(/plot\s*\(([^,)]+)/)
        if (plotMatch) {
          const varName = plotMatch[1].trim()
          processedLines.push(`_plots.set('${varName}', ${varName});`)
        }
      } else {
        processedLines.push(line)
      }
    }

    return processedLines.join('\n')
  }

  private buildDataPoints(candles: Candle[], plots: Map<string, number[]>): IndicatorDataPoint[] {
    const dataPoints: IndicatorDataPoint[] = []

    for (let i = 0; i < candles.length; i++) {
      const values: Record<string, number> = {}

      for (const [plotId, series] of plots.entries()) {
        if (series[i] !== undefined && series[i] !== null && !isNaN(series[i])) {
          values[plotId] = series[i]
        }
      }

      dataPoints.push({
        timestamp: candles[i].timestamp,
        values,
      })
    }

    return dataPoints
  }
}
