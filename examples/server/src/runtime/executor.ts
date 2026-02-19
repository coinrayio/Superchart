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
      // Built-in variables (these are arrays representing the full series)
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

      // Bar index and time information
      bar_index: Array.from({ length: candles.length }, (_, i) => i),
      last_bar_index: candles.length - 1,
      timenow: Date.now(),

      // Bar state variables (for v6 execution model)
      barstate: {
        isfirst: false,
        islast: false,
        ishistory: true,
        isrealtime: false,
        isnew: true,
        isconfirmed: true,
        islastconfirmedhistory: false
      },

      // Special na value (used as value in expressions like `x ? y : na`)
      na: NaN,

      // na() function form (used in v4 like `na(x)` to check for NaN)
      _isNa: (x: unknown) => {
        if (Array.isArray(x)) return x.map((v: any) => v === null || v === undefined || (typeof v === 'number' && isNaN(v)))
        return x === null || x === undefined || (typeof x === 'number' && isNaN(x))
      },

      // Pine Script lookback: series[n] means "shift series by n bars"
      // Returns a new array where result[i] = series[i - n] (NaN for i < n)
      _lb: (series: unknown, n: unknown): number[] | number => {
        if (!Array.isArray(series)) return series as number
        const shift = typeof n === 'number' ? n : 0
        if (shift === 0) return series
        return series.map((_: any, i: number) => i >= shift ? series[i - shift] : NaN)
      },

      // Element-wise comparison helpers for array-vs-array and array-vs-scalar
      _gt: (a: unknown, b: unknown): boolean[] | boolean => {
        if (Array.isArray(a) && Array.isArray(b)) return a.map((v: any, i: number) => v > b[i])
        if (Array.isArray(a)) return a.map((v: any) => v > (b as number))
        if (Array.isArray(b)) return (b as number[]).map((v: any) => (a as number) > v)
        return (a as number) > (b as number)
      },
      _lt: (a: unknown, b: unknown): boolean[] | boolean => {
        if (Array.isArray(a) && Array.isArray(b)) return a.map((v: any, i: number) => v < b[i])
        if (Array.isArray(a)) return a.map((v: any) => v < (b as number))
        if (Array.isArray(b)) return (b as number[]).map((v: any) => (a as number) < v)
        return (a as number) < (b as number)
      },
      _gte: (a: unknown, b: unknown): boolean[] | boolean => {
        if (Array.isArray(a) && Array.isArray(b)) return a.map((v: any, i: number) => v >= b[i])
        if (Array.isArray(a)) return a.map((v: any) => v >= (b as number))
        if (Array.isArray(b)) return (b as number[]).map((v: any) => (a as number) >= v)
        return (a as number) >= (b as number)
      },
      _lte: (a: unknown, b: unknown): boolean[] | boolean => {
        if (Array.isArray(a) && Array.isArray(b)) return a.map((v: any, i: number) => v <= b[i])
        if (Array.isArray(a)) return a.map((v: any) => v <= (b as number))
        if (Array.isArray(b)) return (b as number[]).map((v: any) => (a as number) <= v)
        return (a as number) <= (b as number)
      },
      _eq: (a: unknown, b: unknown): boolean[] | boolean => {
        if (Array.isArray(a) && Array.isArray(b)) return a.map((v: any, i: number) => v === b[i])
        if (Array.isArray(a)) return a.map((v: any) => v === b)
        if (Array.isArray(b)) return (b as number[]).map((v: any) => a === v)
        return a === b
      },
      _neq: (a: unknown, b: unknown): boolean[] | boolean => {
        if (Array.isArray(a) && Array.isArray(b)) return a.map((v: any, i: number) => v !== b[i])
        if (Array.isArray(a)) return a.map((v: any) => v !== b)
        if (Array.isArray(b)) return (b as number[]).map((v: any) => a !== v)
        return a !== b
      },

      // Element-wise boolean operators
      _and: (a: unknown, b: unknown): boolean[] | boolean => {
        if (Array.isArray(a) && Array.isArray(b)) return a.map((v: any, i: number) => v && b[i])
        if (Array.isArray(a)) return a.map((v: any) => v && b)
        if (Array.isArray(b)) return (b as boolean[]).map((v: any) => a && v)
        return (a as boolean) && (b as boolean)
      },
      _or: (a: unknown, b: unknown): boolean[] | boolean => {
        if (Array.isArray(a) && Array.isArray(b)) return a.map((v: any, i: number) => v || b[i])
        if (Array.isArray(a)) return a.map((v: any) => v || b)
        if (Array.isArray(b)) return (b as boolean[]).map((v: any) => a || v)
        return (a as boolean) || (b as boolean)
      },
      _not: (a: unknown): boolean[] | boolean => {
        if (Array.isArray(a)) return a.map((v: any) => !v)
        return !(a as boolean)
      },

      // Element-wise ternary: _tern(cond, trueVal, falseVal)
      _tern: (cond: unknown, a: unknown, b: unknown): unknown => {
        if (Array.isArray(cond)) {
          return (cond as boolean[]).map((c: any, i: number) => {
            const aVal = Array.isArray(a) ? a[i] : a
            const bVal = Array.isArray(b) ? b[i] : b
            return c ? aVal : bVal
          })
        }
        return cond ? a : b
      },

      // Element-wise arithmetic on arrays
      _add: (a: unknown, b: unknown): number[] | number => {
        if (Array.isArray(a) && Array.isArray(b)) return a.map((v: any, i: number) => v + b[i])
        if (Array.isArray(a)) return a.map((v: any) => v + (b as number))
        if (Array.isArray(b)) return (b as number[]).map((v: any) => (a as number) + v)
        return (a as number) + (b as number)
      },
      _sub: (a: unknown, b: unknown): number[] | number => {
        if (Array.isArray(a) && Array.isArray(b)) return a.map((v: any, i: number) => v - b[i])
        if (Array.isArray(a)) return a.map((v: any) => v - (b as number))
        if (Array.isArray(b)) return (b as number[]).map((v: any) => (a as number) - v)
        return (a as number) - (b as number)
      },
      _mul: (a: unknown, b: unknown): number[] | number => {
        if (Array.isArray(a) && Array.isArray(b)) return a.map((v: any, i: number) => v * b[i])
        if (Array.isArray(a)) return a.map((v: any) => v * (b as number))
        if (Array.isArray(b)) return (b as number[]).map((v: any) => (a as number) * v)
        return (a as number) * (b as number)
      },
      _div: (a: unknown, b: unknown): number[] | number => {
        if (Array.isArray(a) && Array.isArray(b)) return a.map((v: any, i: number) => b[i] !== 0 ? v / b[i] : NaN)
        if (Array.isArray(a)) return a.map((v: any) => (b as number) !== 0 ? v / (b as number) : NaN)
        if (Array.isArray(b)) return (b as number[]).map((v: any) => v !== 0 ? (a as number) / v : NaN)
        return (b as number) !== 0 ? (a as number) / (b as number) : NaN
      },

      // Input namespace (v5+) and bare function (v4 compat)
      // input is callable as input(defval, ...) for v4, and has .int/.float/etc. for v5+
      input: Object.assign(
        (defval: unknown, ..._args: unknown[]) => defval,
        {
          int: (defval: number, ..._args: unknown[]) => defval,
          float: (defval: number, ..._args: unknown[]) => defval,
          bool: (defval: boolean, ..._args: unknown[]) => defval,
          string: (defval: string, ..._args: unknown[]) => defval,
          color: (defval: string, ..._args: unknown[]) => defval,
          source: (defval: number[], ..._args: unknown[]) => defval,
          timeframe: (defval: string, ..._args: unknown[]) => defval,
          symbol: (defval: string, ..._args: unknown[]) => defval,
        }
      ),

      // String namespace functions (Pine v5+)
      str: {
        tostring: (value: unknown, _format?: string) => String(value),
        format: (formatString: string, ...args: unknown[]) => {
          return formatString.replace(/{(\d+)}/g, (_match, index) => String(args[index] || ''))
        },
        length: (str: string) => str.length,
        tonumber: (str: string) => parseFloat(str),
        contains: (source: string, str: string) => source.includes(str),
        pos: (source: string, str: string) => source.indexOf(str),
        substring: (source: string, begin: number, end?: number) => source.substring(begin, end),
        lower: (source: string) => source.toLowerCase(),
        upper: (source: string) => source.toUpperCase(),
        replace: (source: string, target: string, replacement: string) => source.replace(target, replacement),
        replace_all: (source: string, target: string, replacement: string) => source.replaceAll(target, replacement),
      },

      // Input settings (actual values from user configuration)
      ...Object.fromEntries(
        Array.from(script.inputs.entries()).map(([key, { defaultValue }]) => [
          key,
          settings[key] ?? defaultValue,
        ])
      ),

      // ta.* namespace (Pine Script v5+ technical analysis functions)
      ta: {
        sma: (source: number[], length: number) => this.indicators.sma(source, length),
        ema: (source: number[], length: number) => this.indicators.ema(source, length),
        wma: (source: number[], length: number) => this.indicators.wma(source, length),
        rma: (source: number[], length: number) => this.indicators.rma(source, length),
        vwma: (source: number[], length: number) => this.indicators.sma(source, length), // TODO: implement proper VWMA
        rsi: (source: number[], length: number) => this.indicators.rsi(source, length),
        macd: (source: number[], fastLen: number, slowLen: number, signalLen: number) =>
          this.indicators.macd(source, fastLen, slowLen, signalLen),
        bb: (source: number[], length: number, mult: number) =>
          this.indicators.bollingerBands(source, length, mult),
        atr: (length: number) => {
          const highs = context.high as number[]
          const lows = context.low as number[]
          const closes = context.close as number[]
          return this.indicators.atr(highs, lows, closes, length)
        },
        stoch: (close: number[], high: number[], low: number[], length: number) =>
          this.indicators.stochastic(close, high, low, length),
        stdev: (source: number[], length: number) => this.indicators.stdev(source, length),
        change: (source: number[], length: number = 1) => {
          return source.map((val, i) => i >= length ? val - source[i - length] : NaN)
        },
        mom: (source: number[], length: number) => {
          return source.map((val, i) => i >= length ? val - source[i - length] : NaN)
        },
        highest: (source: number[], length: number) => this.indicators.highest(source, length),
        lowest: (source: number[], length: number) => this.indicators.lowest(source, length),
        cross: (a: number[], b: number[]) => this.indicators.crossover(a, b),
        crossover: (a: number[], b: number[]) => this.indicators.crossover(a, b),
        crossunder: (a: number[], b: number[]) => this.indicators.crossunder(a, b),
        barssince: (condition: boolean[]) => {
          return condition.map((cond, i) => {
            if (cond) return 0
            for (let j = i - 1; j >= 0; j--) {
              if (condition[j]) return i - j
            }
            return NaN
          })
        },
        valuewhen: (condition: boolean[], source: number[], occurrence: number) => {
          return source.map((_, i) => {
            let count = 0
            for (let j = i; j >= 0; j--) {
              if (condition[j]) {
                if (count === occurrence) return source[j]
                count++
              }
            }
            return NaN
          })
        },
        cci: (source: number[], length: number) => {
          // CCI implementation using TA-Lib
          return this.indicators.execute('CCI', {
            startIdx: 0,
            endIdx: source.length - 1,
            high: context.high,
            low: context.low,
            close: context.close,
            optInTimePeriod: length
          }).result?.outReal || []
        },
        mfi: (source: number[], length: number) => {
          return this.indicators.execute('MFI', {
            startIdx: 0,
            endIdx: source.length - 1,
            high: context.high,
            low: context.low,
            close: context.close,
            volume: context.volume,
            optInTimePeriod: length
          }).result?.outReal || []
        },
      },

      // Legacy functions (backwards compatibility - no namespace)
      sma: (source: number[], length: number) => this.indicators.sma(source, length),
      ema: (source: number[], length: number) => this.indicators.ema(source, length),
      wma: (source: number[], length: number) => this.indicators.wma(source, length),
      rma: (source: number[], length: number) => this.indicators.rma(source, length),
      rsi: (source: number[], length: number) => this.indicators.rsi(source, length),
      macd: (source: number[], fastLen: number, slowLen: number, signalLen: number) =>
        this.indicators.macd(source, fastLen, slowLen, signalLen),
      bb: (source: number[], length: number, mult: number) =>
        this.indicators.bollingerBands(source, length, mult),
      atr: (length: number) => {
        const highs = context.high as number[]
        const lows = context.low as number[]
        const closes = context.close as number[]
        return this.indicators.atr(highs, lows, closes, length)
      },
      stoch: (close: number[], high: number[], low: number[], length: number) =>
        this.indicators.stochastic(close, high, low, length),
      stdev: (source: number[], length: number) => this.indicators.stdev(source, length),
      sum: (source: number[], length: number) => this.indicators.sum(source, length),
      highest: (source: number[], length: number) => this.indicators.highest(source, length),
      lowest: (source: number[], length: number) => this.indicators.lowest(source, length),
      crossover: (a: number[], b: number[]) => this.indicators.crossover(a, b),
      crossunder: (a: number[], b: number[]) => this.indicators.crossunder(a, b),
      barssince: (condition: boolean[]) => {
        return condition.map((cond, i) => {
          if (cond) return 0
          for (let j = i - 1; j >= 0; j--) {
            if (condition[j]) return i - j
          }
          return NaN
        })
      },
      valuewhen: (condition: boolean[], source: number[], occurrence: number) => {
        return source.map((_, i) => {
          let count = 0
          for (let j = i; j >= 0; j--) {
            if (condition[j]) {
              if (count === occurrence) return source[j]
              count++
            }
          }
          return NaN
        })
      },
      pivothigh: (source: number[], leftbars: number, rightbars: number) => {
        // Pine Script semantics: pivothigh at bar i reports whether bar (i - rightbars)
        // is a pivot high. The detection is delayed by rightbars bars because Pine needs
        // to see rightbars future bars to confirm the pivot.
        const result = new Array(source.length).fill(NaN)
        for (let i = 0; i < source.length; i++) {
          if (i < leftbars || i + rightbars >= source.length) continue
          const val = source[i]
          let isPivot = true
          for (let j = i - leftbars; j < i; j++) {
            if (source[j] >= val) { isPivot = false; break }
          }
          if (isPivot) {
            for (let j = i + 1; j <= i + rightbars; j++) {
              if (source[j] >= val) { isPivot = false; break }
            }
          }
          if (isPivot) {
            result[i + rightbars] = val
          }
        }
        return result
      },
      pivotlow: (source: number[], leftbars: number, rightbars: number) => {
        // Pine Script semantics: pivotlow at bar i reports whether bar (i - rightbars)
        // is a pivot low. The detection is delayed by rightbars bars.
        const result = new Array(source.length).fill(NaN)
        for (let i = 0; i < source.length; i++) {
          if (i < leftbars || i + rightbars >= source.length) continue
          const val = source[i]
          let isPivot = true
          for (let j = i - leftbars; j < i; j++) {
            if (source[j] <= val) { isPivot = false; break }
          }
          if (isPivot) {
            for (let j = i + 1; j <= i + rightbars; j++) {
              if (source[j] <= val) { isPivot = false; break }
            }
          }
          if (isPivot) {
            result[i + rightbars] = val
          }
        }
        return result
      },

      // Utility functions (na handling)
      nz: (value: number | number[], replacement: number = 0) => {
        if (Array.isArray(value)) {
          return value.map(v => isNaN(v) || v === null || v === undefined ? replacement : v)
        }
        return isNaN(value) || value === null || value === undefined ? replacement : value
      },
      fixnan: (source: number[]) => {
        const result: number[] = []
        let lastValid = 0
        for (let i = 0; i < source.length; i++) {
          if (!isNaN(source[i]) && source[i] !== null && source[i] !== undefined) {
            lastValid = source[i]
            result.push(source[i])
          } else {
            result.push(lastValid)
          }
        }
        return result
      },

      // Color namespace functions
      color: {
        new: (baseColor: string, transparency: number) => {
          // Implementation depends on color format
          return `${baseColor}${Math.floor((1 - transparency / 100) * 255).toString(16).padStart(2, '0')}`
        },
        rgb: (red: number, green: number, blue: number, transp: number = 0) => {
          const alpha = 1 - (transp / 100)
          return `rgba(${red}, ${green}, ${blue}, ${alpha})`
        },
        // Standard colors
        red: '#FF0000',
        green: '#00FF00',
        blue: '#0000FF',
        yellow: '#FFFF00',
        white: '#FFFFFF',
        black: '#000000',
        orange: '#FFA500',
        purple: '#800080',
        aqua: '#00FFFF',
        fuchsia: '#FF00FF',
        gray: '#808080',
        lime: '#00FF00',
        maroon: '#800000',
        navy: '#000080',
        olive: '#808000',
        silver: '#C0C0C0',
        teal: '#008080',
      },

      // Math namespace functions (Pine v5+)
      math: {
        abs: Math.abs,
        max: Math.max,
        min: Math.min,
        pow: Math.pow,
        sqrt: Math.sqrt,
        log: Math.log,
        log10: Math.log10,
        exp: Math.exp,
        round: Math.round,
        floor: Math.floor,
        ceil: Math.ceil,
        sign: Math.sign,
        sin: Math.sin,
        cos: Math.cos,
        tan: Math.tan,
        asin: Math.asin,
        acos: Math.acos,
        atan: Math.atan,
      },

      // Legacy Math functions (backwards compatibility)
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
      sign: Math.sign,

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
      variance: (params: any) => this.indicators.execute('VAR', params),

      // TA-Lib Price Transform (5 functions)
      avgprice: (params: any) => this.indicators.execute('AVGPRICE', params),
      avgdev: (params: any) => this.indicators.execute('AVGDEV', params),
      medprice: (params: any) => this.indicators.execute('MEDPRICE', params),
      typprice: (params: any) => this.indicators.execute('TYPPRICE', params),
      wclprice: (params: any) => this.indicators.execute('WCLPRICE', params),

      // Plotting functions (store for later rendering)
      plot: (series: number[], title?: string, _color?: string, _linewidth?: number, _style?: string) => {
        const plotId = title || 'plot'
        const plots = context._plots as Map<string, number[]>
        plots.set(plotId, series)
      },
      hline: (_price: number, _title?: string, _color?: string, _linestyle?: string) => {
        // Store hline metadata
      },
      fill: (_plot1: string, _plot2: string, _color?: string, _title?: string) => {
        // Store fill metadata
      },
      bgcolor: (_color: string, _offset?: number, _editable?: boolean, _show_last?: number, _title?: string) => {
        // Background color - store for rendering
      },
      barcolor: (_color: string, _offset?: number, _editable?: boolean, _show_last?: number, _title?: string) => {
        // Bar color - store for rendering
      },
      plotshape: (_series: boolean[], _title?: string, _style?: string, _location?: string, _color?: string, _offset?: number, _text?: string, _textcolor?: string, _editable?: boolean, _size?: string, _show_last?: number, _display?: string) => {
        // Store plotshape metadata
      },
      plotchar: (_series: boolean[], _char?: string, _location?: string, _color?: string, _offset?: number, _text?: string, _textcolor?: string, _editable?: boolean, _size?: string, _show_last?: number) => {
        // Store plotchar metadata
      },
      plotarrow: (_series: number[], _title?: string, _colorup?: string, _colordown?: string, _offset?: number, _minheight?: number, _maxheight?: number, _editable?: boolean, _show_last?: number, _display?: string) => {
        // Store plotarrow metadata
      },
      plotcandle: (_open: number[], _high: number[], _low: number[], _close: number[], _title?: string, _color?: string, _wickcolor?: string, _editable?: boolean, _show_last?: number, _bordercolor?: string, _display?: string) => {
        // Store plotcandle metadata
      },
      alertcondition: (_condition: boolean, _title?: string, _message?: string) => {
        // Store alert condition
      },
      alert: (_message: string, _freq?: string) => {
        // Trigger alert
      },

      // Results storage
      _plots: new Map<string, number[]>(),
      _plotColors: new Map<string, string[]>(),
    }

    // Resolve variable references in input defaults (e.g., defval=close → actual close array)
    const builtInSeries = new Set(['close', 'open', 'high', 'low', 'volume', 'hl2', 'hlc3', 'ohlc4', 'time'])
    for (const [key] of script.inputs.entries()) {
      const val = context[key]
      if (typeof val === 'string' && builtInSeries.has(val)) {
        context[key] = context[val]
      }
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
      const plotColors = context._plotColors as Map<string, string[]>

      // Debug: log per-bar color info
      if (plotColors.size > 0) {
        for (const [key, colorSeries] of plotColors.entries()) {
          const isArray = Array.isArray(colorSeries)
          const nonNull = isArray ? colorSeries.filter(c => c != null).length : 0
          const sample = isArray ? colorSeries.filter(c => c != null).slice(0, 3) : colorSeries
          console.log(`[Executor] plotColors["${key}"]: isArray=${isArray}, nonNull=${nonNull}, sample=`, sample)
        }
      } else {
        console.log('[Executor] plotColors is empty (no per-bar colors extracted)')
      }

      return this.buildDataPoints(candles, plots, plotColors)
    } catch (error: any) {
      console.error('Script execution error:', error)
      throw new Error(`Script execution failed: ${(error as Error).message}`)
    }
  }

  private extractCalculationCode(code: string): string {
    // Remove version directive
    let processed = code.replace(/\/\/@version=\d+/gi, '')

    // Remove indicator/strategy/study declaration (handle multiline with nested parens)
    processed = processed
      .replace(/indicator\s*\([\s\S]*?\)\s*\n?/i, '')
      .replace(/strategy\s*\([\s\S]*?\)\s*\n?/i, '')
      .replace(/study\s*\([\s\S]*?\)\s*\n?/i, '')

    // Strip inline comments (// ...) from each line, respecting strings
    processed = processed.split('\n').map(line => {
      let inStr = false
      let strChar = ''
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (inStr) {
          if (ch === strChar && line[i - 1] !== '\\') inStr = false
        } else if (ch === '"' || ch === "'") {
          inStr = true
          strChar = ch
        } else if (ch === '/' && i + 1 < line.length && line[i + 1] === '/') {
          return line.substring(0, i).trimEnd()
        }
      }
      return line
    }).join('\n')

    // Convert Pine hex color literals #RRGGBB / #RGB to JS strings '#RRGGBB'
    processed = processed.replace(/#([0-9a-fA-F]{6})\b/g, "'#$1'")
    processed = processed.replace(/#([0-9a-fA-F]{8})\b/g, "'#$1'")
    processed = processed.replace(/#([0-9a-fA-F]{3})\b/g, "'#$1'")

    // Convert na() function calls to _isNa() (na is kept as NaN value in context)
    processed = processed.replace(/\bna\s*\(/g, '_isNa(')

    // Convert Pine-style format constants (format.price, format.volume etc.)
    processed = processed.replace(/format\.price/g, "'price'")
    processed = processed.replace(/format\.volume/g, "'volume'")
    processed = processed.replace(/format\.percent/g, "'percent'")

    // Convert hline.style_dotted / hline.style_dashed / hline.style_solid
    processed = processed.replace(/hline\.style_dotted/g, "'dotted'")
    processed = processed.replace(/hline\.style_dashed/g, "'dashed'")
    processed = processed.replace(/hline\.style_solid/g, "'solid'")

    // Convert shape.* constants
    processed = processed.replace(/shape\.labelup/g, "'labelup'")
    processed = processed.replace(/shape\.labeldown/g, "'labeldown'")
    processed = processed.replace(/shape\.triangleup/g, "'triangleup'")
    processed = processed.replace(/shape\.triangledown/g, "'triangledown'")
    processed = processed.replace(/shape\.cross/g, "'cross'")
    processed = processed.replace(/shape\.xcross/g, "'xcross'")
    processed = processed.replace(/shape\.diamond/g, "'diamond'")
    processed = processed.replace(/shape\.flag/g, "'flag'")
    processed = processed.replace(/shape\.circle/g, "'circle'")
    processed = processed.replace(/shape\.square/g, "'square'")
    processed = processed.replace(/shape\.arrowup/g, "'arrowup'")
    processed = processed.replace(/shape\.arrowdown/g, "'arrowdown'")

    // Convert location.* constants
    processed = processed.replace(/location\.abovebar/g, "'abovebar'")
    processed = processed.replace(/location\.belowbar/g, "'belowbar'")
    processed = processed.replace(/location\.top/g, "'top'")
    processed = processed.replace(/location\.bottom/g, "'bottom'")
    processed = processed.replace(/location\.absolute/g, "'absolute'")

    // Convert size.* constants
    processed = processed.replace(/size\.tiny/g, "'tiny'")
    processed = processed.replace(/size\.small/g, "'small'")
    processed = processed.replace(/size\.normal/g, "'normal'")
    processed = processed.replace(/size\.large/g, "'large'")
    processed = processed.replace(/size\.huge/g, "'huge'")
    processed = processed.replace(/size\.auto/g, "'auto'")

    // Convert Pine lookback notation: identifier[expr] → _lb(identifier, expr)
    // This matches word[word], word[number], and word[expr] patterns
    // But NOT function calls like func[0] or array literals - only known series vars
    // We do multiple passes to handle nested lookbacks like osc[lbR]
    processed = processed.replace(/\b([a-zA-Z_]\w*)\[([a-zA-Z_]\w*)\]/g, '_lb($1, $2)')
    processed = processed.replace(/\b([a-zA-Z_]\w*)\[(\d+)\]/g, '_lb($1, $2)')

    // Convert Pine 'and' / 'or' / 'not' boolean operators to JS
    processed = processed.replace(/\band\b/g, '&&')
    processed = processed.replace(/\bor\b/g, '||')
    processed = processed.replace(/\bnot\b/g, '!')

    // Convert Pine 'true' / 'false' (these are same in JS, no conversion needed)
    // Convert Pine '?' ternary (same as JS, no conversion needed)

    // Convert Pine-style user-defined functions: funcName(params) => \n\tbody
    // e.g. _inRange(cond) =>\n\tbars = barssince(cond == true)\n\trangeLower <= bars and bars <= rangeUpper
    processed = processed.replace(
      /^(\w+)\s*\(([^)]*)\)\s*=>\s*$/gm,
      'function $1($2) {'
    )

    // Handle the indented body lines after => function definitions
    // This requires line-by-line processing below

    // Join multi-line expressions (unclosed parentheses) into single lines
    const rawLines = processed.split('\n')
    const lines: string[] = []
    let accumulator = ''
    let parenDepth = 0

    for (const rawLine of rawLines) {
      const trimmed = rawLine.trim()

      // Skip empty lines and comments when not accumulating
      if (parenDepth === 0 && (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*'))) {
        if (!accumulator) {
          lines.push(rawLine)
        }
        continue
      }

      accumulator = accumulator ? accumulator + ' ' + trimmed : rawLine

      // Count parens (skip chars inside strings)
      let inStr = false
      let strChar = ''
      for (let j = 0; j < trimmed.length; j++) {
        const ch = trimmed[j]
        if (inStr) {
          if (ch === strChar && trimmed[j - 1] !== '\\') inStr = false
        } else if (ch === '"' || ch === "'") {
          inStr = true
          strChar = ch
        } else if (ch === '/' && j + 1 < trimmed.length && trimmed[j + 1] === '/') {
          break // line comment, stop counting
        } else if (ch === '(') {
          parenDepth++
        } else if (ch === ')') {
          parenDepth--
        }
      }

      if (parenDepth <= 0) {
        lines.push(accumulator)
        accumulator = ''
        parenDepth = 0
      }
    }

    if (accumulator) lines.push(accumulator)

    // Process lines
    const processedLines: string[] = []
    let inFunctionBody = false
    let functionIndent = ''
    let plotshapeIndex = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue

      // Detect function definition we just converted
      if (trimmed.startsWith('function ') && trimmed.endsWith('{')) {
        processedLines.push(trimmed)
        inFunctionBody = true
        // Determine the expected indent of body lines (next line's indent)
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1]
          const indent = nextLine.match(/^(\s+)/)?.[1] || '\t'
          functionIndent = indent
        }
        continue
      }

      // If inside a function body, collect indented lines
      if (inFunctionBody) {
        if (line.startsWith(functionIndent) || line.startsWith('\t')) {
          // This is a body line - the last expression is the return value
          const nextLine = i + 1 < lines.length ? lines[i + 1] : ''
          const nextTrimmed = nextLine.trim()
          const nextIsBody = nextLine.startsWith(functionIndent) || nextLine.startsWith('\t')

          if (!nextIsBody || !nextTrimmed || nextTrimmed.startsWith('//')) {
            // Last line of function body - add return, transform expression
            const bodyAssign = trimmed.match(/^(\w+)\s*=\s*(.+)$/)
            if (bodyAssign) {
              processedLines.push(`  ${bodyAssign[1]} = ${this.transformExpression(bodyAssign[2])};`)
              processedLines.push(`  return ${bodyAssign[1]};`)
            } else {
              processedLines.push(`  return ${this.transformExpression(trimmed)};`)
            }
            processedLines.push('}')
            inFunctionBody = false
          } else {
            const bodyAssign = trimmed.match(/^(\w+)\s*=\s*(.+)$/)
            if (bodyAssign) {
              processedLines.push(`  ${bodyAssign[1]} = ${this.transformExpression(bodyAssign[2])};`)
            } else {
              processedLines.push(`  ${trimmed};`)
            }
          }
          continue // Always continue after processing a function body line
        } else {
          // No longer indented - close function
          processedLines.push('}')
          inFunctionBody = false
          // Fall through to process this line normally
        }
      }

      // Skip input declarations (values are already in context from parser)
      if (trimmed.match(/^\w+\s*=\s*input(?:\.\w+)?\s*\(/)) {
        processedLines.push(`// ${trimmed}`)
        continue
      }

      // Transform plot calls to store results in _plots map
      if (trimmed.match(/^\w+\s*=\s*plot\s*\(/)) {
        // Variable assignment like: upl = plot(...)
        // Extract the variable name and first argument (handle ternary with balanced parens)
        const assignMatch = trimmed.match(/^(\w+)\s*=\s*plot\s*\(/)
        if (assignMatch) {
          const varName = assignMatch[1]
          const series = this.extractFirstPlotArg(trimmed.substring(assignMatch[0].length))
          const transformed = this.transformExpression(series)
          // Reverse _lb() back to [] notation in key to match parser's original series key
          const seriesKey = series.trim().replace(/_lb\((\w+),\s*(\w+)\)/g, '$1[$2]')
          processedLines.push(`${varName} = ${transformed}; _plots.set('${seriesKey}', ${varName});`)
        } else {
          processedLines.push(trimmed)
        }
      } else if (trimmed.startsWith('plot(')) {
        const series = this.extractFirstPlotArg(trimmed.substring(5))
        const transformed = this.transformExpression(series)
        // Reverse _lb() back to [] notation in key to match parser's original series key
        const seriesKey = series.trim().replace(/_lb\((\w+),\s*(\w+)\)/g, '$1[$2]')
        // Check for offset parameter (e.g., offset=-lbR)
        const offsetMatch = trimmed.match(/\boffset\s*=\s*([^,)]+)/)
        // Check for ternary color parameter (e.g., color=(cond ? colorA : colorB))
        const colorTernaryMatch = trimmed.match(/\bcolor\s*=\s*\(?\s*(\w+\s*\?\s*\w+\s*:\s*\w+)\s*\)?/)
        const colorExpr = colorTernaryMatch ? this.transformExpression(colorTernaryMatch[1].trim()) : null
        if (offsetMatch) {
          const offsetExpr = this.transformExpression(offsetMatch[1].trim())
          let code = `{ const __r = (${transformed}); const __off = (${offsetExpr}); if (__off !== 0 && Array.isArray(__r)) { const __s = new Array(__r.length).fill(NaN); for (let __i = 0; __i < __r.length; __i++) { const __src = __i - __off; if (__src >= 0 && __src < __r.length) __s[__i] = __r[__src]; } _plots.set('${seriesKey}', __s); } else { _plots.set('${seriesKey}', __r); }`
          if (colorExpr) {
            code += ` try { const __c = (${colorExpr}); if (typeof __off === 'number' && __off !== 0 && Array.isArray(__c)) { const __sc = new Array(__c.length).fill(null); for (let __i = 0; __i < __c.length; __i++) { const __src = __i - __off; if (__src >= 0 && __src < __c.length) __sc[__i] = __c[__src]; } _plotColors.set('${seriesKey}', __sc); } else { _plotColors.set('${seriesKey}', __c); } } catch(e) { /* color eval failed, use default */ }`
          }
          code += ` }`
          processedLines.push(code)
        } else {
          let code = `_plots.set('${seriesKey}', (${transformed}));`
          if (colorExpr) {
            code += ` try { _plotColors.set('${seriesKey}', (${colorExpr})); } catch(e) { /* color eval failed */ }`
          }
          processedLines.push(code)
        }
      } else if (trimmed.startsWith('hline(') || trimmed.match(/^\w+\s*=\s*hline\s*\(/)) {
        // hline calls are no-ops for now (horizontal lines are metadata)
        processedLines.push(`// ${trimmed}`)
      } else if (trimmed.startsWith('fill(')) {
        // fill calls are no-ops for now
        processedLines.push(`// ${trimmed}`)
      } else if (trimmed.startsWith('bgcolor(')) {
        processedLines.push(`// ${trimmed}`)
      } else if (trimmed.startsWith('plotshape(')) {
        // Extract condition (first arg) and evaluate it to produce shape data
        const series = this.extractFirstPlotArg(trimmed.substring(10))
        const transformed = this.transformExpression(series)
        const shapeKey = `plotshape_${plotshapeIndex++}`
        // Check for offset parameter (e.g., offset=-lbR)
        const shapeOffsetMatch = trimmed.match(/\boffset\s*=\s*([^,)]+)/)
        // Convert boolean/value series: truthy → numeric value (or 1), falsy → NaN, then apply offset
        if (shapeOffsetMatch) {
          const shapeOffsetExpr = this.transformExpression(shapeOffsetMatch[1].trim())
          processedLines.push(`{ const __sv = ${transformed}; const __mapped = Array.isArray(__sv) ? __sv.map(v => (v && v !== 0 && !isNaN(v)) ? (typeof v === 'boolean' ? 1 : v) : NaN) : __sv; const __off = (${shapeOffsetExpr}); if (__off !== 0 && Array.isArray(__mapped)) { const __s = new Array(__mapped.length).fill(NaN); for (let __i = 0; __i < __mapped.length; __i++) { const __src = __i - __off; if (__src >= 0 && __src < __mapped.length) __s[__i] = __mapped[__src]; } _plots.set('${shapeKey}', __s); } else { _plots.set('${shapeKey}', __mapped); } }`)
        } else {
          processedLines.push(`{ const __sv = ${transformed}; _plots.set('${shapeKey}', Array.isArray(__sv) ? __sv.map(v => (v && v !== 0 && !isNaN(v)) ? (typeof v === 'boolean' ? 1 : v) : NaN) : __sv); }`)
        }
      } else if (trimmed.startsWith('plotchar(')) {
        processedLines.push(`// ${trimmed}`)
      } else if (trimmed.startsWith('alertcondition(')) {
        processedLines.push(`// ${trimmed}`)
      } else {
        // Transform assignment expressions for element-wise array operations
        const assignMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/)
        if (assignMatch) {
          const varName = assignMatch[1]
          const rhs = assignMatch[2].replace(/;$/, '')
          processedLines.push(`${varName} = ${this.transformExpression(rhs)}`)
        } else {
          processedLines.push(trimmed)
        }
      }
    }

    // Close any unclosed function
    if (inFunctionBody) {
      processedLines.push('}')
    }

    return processedLines.join('\n')
  }

  /**
   * Extract the first argument from a plot() call, handling ternary expressions.
   * Input is the string AFTER "plot(" - e.g., "plFound ? osc[lbR] : na, title=..."
   */
  private extractFirstPlotArg(afterParen: string): string {
    let depth = 0
    let ternaryDepth = 0
    let i = 0
    const s = afterParen

    while (i < s.length) {
      const ch = s[i]
      if (ch === '(' || ch === '[') depth++
      else if (ch === ')' || ch === ']') {
        if (depth === 0) {
          // End of plot() call
          return s.substring(0, i).trim()
        }
        depth--
      } else if (ch === '?') ternaryDepth++
      else if (ch === ':' && ternaryDepth > 0) ternaryDepth--
      else if (ch === ',' && depth === 0 && ternaryDepth === 0) {
        return s.substring(0, i).trim()
      } else if (ch === '"' || ch === "'") {
        // Skip string
        const quote = ch
        i++
        while (i < s.length && s[i] !== quote) {
          if (s[i] === '\\') i++
          i++
        }
      }
      i++
    }
    return s.trim()
  }

  /**
   * Transform a line's expression to use element-wise helpers for array operations.
   * Converts: a + b → _add(a, b), a > b → _gt(a, b), a && b → _and(a, b),
   *           a ? b : c → _tern(a, b, c)
   * Handles parentheses and function calls correctly.
   */
  private transformExpression(expr: string): string {
    // Tokenize the expression
    const tokens = this.tokenize(expr)
    if (tokens.length === 0) return expr

    // Transform from lowest to highest precedence
    try {
      const result = this.transformTernary(tokens, 0)
      return result.text
    } catch {
      return expr // Fall back to original on any parse error
    }
  }

  private tokenize(expr: string): string[] {
    const tokens: string[] = []
    let i = 0
    while (i < expr.length) {
      // Skip whitespace
      if (/\s/.test(expr[i])) { i++; continue }

      // String literals
      if (expr[i] === '"' || expr[i] === "'") {
        const quote = expr[i]
        let j = i + 1
        while (j < expr.length && expr[j] !== quote) {
          if (expr[j] === '\\') j++
          j++
        }
        tokens.push(expr.substring(i, j + 1))
        i = j + 1
        continue
      }

      // Two-char operators
      if (i + 1 < expr.length) {
        const two = expr.substring(i, i + 2)
        if (['>=', '<=', '==', '!=', '&&', '||'].includes(two)) {
          tokens.push(two)
          i += 2
          continue
        }
      }

      // Single-char operators and delimiters
      if ('+-*/><!?:(),'.includes(expr[i])) {
        tokens.push(expr[i])
        i++
        continue
      }

      // Identifiers, numbers, and dotted names (e.g., color.red)
      if (/[a-zA-Z_0-9.]/.test(expr[i])) {
        let j = i
        while (j < expr.length && /[a-zA-Z_0-9.]/.test(expr[j])) j++
        tokens.push(expr.substring(i, j))
        i = j
        continue
      }

      // Unknown char - just add it
      tokens.push(expr[i])
      i++
    }
    return tokens
  }

  private transformTernary(tokens: string[], pos: number): { text: string; pos: number } {
    // Parse or-level expression
    const left = this.transformOr(tokens, pos)

    if (left.pos < tokens.length && tokens[left.pos] === '?') {
      const trueExpr = this.transformTernary(tokens, left.pos + 1)
      if (trueExpr.pos < tokens.length && tokens[trueExpr.pos] === ':') {
        const falseExpr = this.transformTernary(tokens, trueExpr.pos + 1)
        return { text: `_tern(${left.text}, ${trueExpr.text}, ${falseExpr.text})`, pos: falseExpr.pos }
      }
    }

    return left
  }

  private transformOr(tokens: string[], pos: number): { text: string; pos: number } {
    let result = this.transformAnd(tokens, pos)

    while (result.pos < tokens.length && tokens[result.pos] === '||') {
      const right = this.transformAnd(tokens, result.pos + 1)
      result = { text: `_or(${result.text}, ${right.text})`, pos: right.pos }
    }

    return result
  }

  private transformAnd(tokens: string[], pos: number): { text: string; pos: number } {
    let result = this.transformComparison(tokens, pos)

    while (result.pos < tokens.length && tokens[result.pos] === '&&') {
      const right = this.transformComparison(tokens, result.pos + 1)
      result = { text: `_and(${result.text}, ${right.text})`, pos: right.pos }
    }

    return result
  }

  private transformComparison(tokens: string[], pos: number): { text: string; pos: number } {
    let result = this.transformAddSub(tokens, pos)

    const compOps: Record<string, string> = { '>': '_gt', '<': '_lt', '>=': '_gte', '<=': '_lte', '==': '_eq', '!=': '_neq' }
    while (result.pos < tokens.length && compOps[tokens[result.pos]]) {
      const op = compOps[tokens[result.pos]]
      const right = this.transformAddSub(tokens, result.pos + 1)
      result = { text: `${op}(${result.text}, ${right.text})`, pos: right.pos }
    }

    return result
  }

  private transformAddSub(tokens: string[], pos: number): { text: string; pos: number } {
    let result = this.transformMulDiv(tokens, pos)

    while (result.pos < tokens.length && (tokens[result.pos] === '+' || tokens[result.pos] === '-')) {
      const op = tokens[result.pos] === '+' ? '_add' : '_sub'
      const right = this.transformMulDiv(tokens, result.pos + 1)
      result = { text: `${op}(${result.text}, ${right.text})`, pos: right.pos }
    }

    return result
  }

  private transformMulDiv(tokens: string[], pos: number): { text: string; pos: number } {
    let result = this.transformUnary(tokens, pos)

    while (result.pos < tokens.length && (tokens[result.pos] === '*' || tokens[result.pos] === '/')) {
      const op = tokens[result.pos] === '*' ? '_mul' : '_div'
      const right = this.transformUnary(tokens, result.pos + 1)
      result = { text: `${op}(${result.text}, ${right.text})`, pos: right.pos }
    }

    return result
  }

  private transformUnary(tokens: string[], pos: number): { text: string; pos: number } {
    if (pos < tokens.length && tokens[pos] === '!') {
      const operand = this.transformUnary(tokens, pos + 1)
      return { text: `_not(${operand.text})`, pos: operand.pos }
    }
    if (pos < tokens.length && tokens[pos] === '-') {
      // Unary minus
      const operand = this.transformUnary(tokens, pos + 1)
      return { text: `_sub(0, ${operand.text})`, pos: operand.pos }
    }
    return this.transformPrimary(tokens, pos)
  }

  private transformPrimary(tokens: string[], pos: number): { text: string; pos: number } {
    if (pos >= tokens.length) return { text: '', pos }

    const token = tokens[pos]

    // Parenthesized expression
    if (token === '(') {
      const inner = this.transformTernary(tokens, pos + 1)
      if (inner.pos < tokens.length && tokens[inner.pos] === ')') {
        return { text: `(${inner.text})`, pos: inner.pos + 1 }
      }
      return { text: `(${inner.text})`, pos: inner.pos }
    }

    // Function call: identifier followed by (
    if (pos + 1 < tokens.length && tokens[pos + 1] === '(' && /^[a-zA-Z_]/.test(token)) {
      // Collect the full argument list (don't transform inside function calls - they handle their own args)
      let depth = 1
      let argStart = pos + 2
      let current = argStart
      const args: string[] = []

      while (current < tokens.length && depth > 0) {
        if (tokens[current] === '(') depth++
        else if (tokens[current] === ')') {
          depth--
          if (depth === 0) {
            if (current > argStart) {
              // Transform each argument
              const argTokens = tokens.slice(argStart, current)
              const argResult = this.transformTernary(argTokens, 0)
              args.push(argResult.text)
            }
            break
          }
        } else if (tokens[current] === ',' && depth === 1) {
          // Transform this argument
          const argTokens = tokens.slice(argStart, current)
          const argResult = this.transformTernary(argTokens, 0)
          args.push(argResult.text)
          argStart = current + 1
        }
        current++
      }

      return { text: `${token}(${args.join(', ')})`, pos: current + 1 }
    }

    // Simple value (identifier, number, string)
    return { text: token, pos: pos + 1 }
  }

  private buildDataPoints(candles: Candle[], plots: Map<string, number[]>, plotColors?: Map<string, string[]>): IndicatorDataPoint[] {
    const dataPoints: IndicatorDataPoint[] = []

    for (let i = 0; i < candles.length; i++) {
      const values: Record<string, number> = {}

      for (const [plotId, series] of plots.entries()) {
        if (series[i] !== undefined && series[i] !== null && !isNaN(series[i])) {
          values[plotId] = series[i]
        }
      }

      const point: IndicatorDataPoint = {
        timestamp: candles[i].timestamp,
        values,
      }

      // Include per-bar colors if available
      if (plotColors && plotColors.size > 0) {
        const colors: Record<string, string> = {}
        for (const [plotId, colorSeries] of plotColors.entries()) {
          if (Array.isArray(colorSeries) && colorSeries[i] != null) {
            colors[plotId] = String(colorSeries[i])
          }
        }
        if (Object.keys(colors).length > 0) {
          point.colors = colors
        }
      }

      dataPoints.push(point)
    }

    return dataPoints
  }
}
