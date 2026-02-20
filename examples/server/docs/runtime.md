# Pine Script Runtime

The runtime consists of two cooperating classes:

- **`PineScriptParser`** (`src/runtime/parser.ts`) — Extracts indicator metadata (title, inputs, plots) from source code without executing it.
- **`PineScriptExecutor`** (`src/runtime/executor.ts`) — Transforms Pine Script into a JavaScript function and executes it element-wise over the full candle array.

Both are used together for every `execute` and `executePreset` call. `PineScriptParser` is also used standalone for the `compile` message.

---

## Supported Pine Script Versions

| Version | Declaration keyword | Support level |
|---|---|---|
| v4 | `study("Title", ...)` | Supported. Legacy namespaced functions (`sma()`, `ema()`, `rsi()`, etc.) are available without the `ta.` prefix. |
| v5 | `indicator("Title", ...)` | Supported. Both namespaced (`ta.sma`) and legacy bare calls. |
| v6 | `indicator("Title", ...)` | Supported. Same as v5 plus newer `input.int`, `input.float` patterns. |

`strategy()` declarations are accepted by the parser (metadata is extracted) but strategy-specific execution logic (`strategy.entry`, `strategy.exit`, etc.) is silently ignored.

---

## PineScriptParser

### Input

A raw Pine Script source string.

### Output

```typescript
interface ParsedScript {
  success: boolean
  metadata?: IndicatorMetadata
  code: string                 // The original source, stored for re-execution
  errors: ScriptDiagnostic[]
  warnings: ScriptDiagnostic[]
  inputs: Map<string, {
    type: string
    defaultValue: unknown
    title?: string
    min?: number
    max?: number
    step?: number
  }>
  plots: Map<string, { type: string; config: Record<string, unknown> }>
}
```

`success` is `true` if no errors were detected. The parser is permissive — most incomplete or partially unsupported scripts still produce a successful parse with a best-effort metadata object.

### What the Parser Extracts

**Indicator declaration:**
- `title` (first positional or `title=` parameter)
- `shorttitle=` → `shortName`
- `overlay=true/false` → `paneId` (`'candle_pane'` or a slug of the title)
- `precision=` → numeric precision for display

**Inputs** (all of these forms are recognized):

```pine
length = input(14, title="Length")           // v4 positional
period = input.int(14, title="Period")       // v5+
fast   = input.float(0.5, minval=0.1)        // float with constraints
show   = input.bool(true, title="Show MA")
src    = input.source(close)
tf     = input.timeframe("60")
```

Extracted per input: default value, title, min, max, step. These become the `settings` array in `IndicatorMetadata`, surfaced to the client as configurable UI controls.

**Plots** (all of these types are recognized):

| Pine function | Output metadata type |
|---|---|
| `plot(series, ...)` | `'plot'` — line, histogram, area, columns |
| `hline(price, ...)` | `'hline'` — static horizontal line |
| `plotshape(series, ...)` | `'plotshape'` — shapes at bar positions |
| `plotchar(series, ...)` | `'plotchar'` — characters at bar positions |
| `fill(plot1, plot2, ...)` | `'fill'` — shaded region between two plots |
| `bgcolor(color, ...)` | `'bgcolor'` — per-bar background color |
| `plotarrow(series, ...)` | `'plotarrow'` — directional arrows |
| `plotcandle(o,h,l,c, ...)` | `'plotcandle'` — custom OHLC candles |

**Color resolution:**

The parser resolves colors at parse time where possible:

| Pine expression | Resolved to |
|---|---|
| `color.red` | `'#FF0000'` |
| `color.green` | `'#00FF00'` |
| `color.rgb(33, 150, 243, 90)` | `'rgba(33, 150, 243, 0.1)'` |
| `color.new(color.red, 80)` | `'rgba(255, 0, 0, 0.2)'` |
| `#2962FF` (hex literal) | `'#2962FF'` |
| `myColor` (variable) | Resolved via variable map if assigned earlier |
| `cond ? color.green : color.red` | Parsed as dynamic ternary; `gapConnect: true` set on the plot |

---

## PineScriptExecutor

### Input

- A `ParsedScript` from `PineScriptParser.parse()`
- A `Candle[]` array (chronological, oldest first)
- An optional `settings` override map

### Output

`IndicatorDataPoint[]` — one element per candle, containing the computed values for all plots.

### Execution Model

The executor does **not** run a bar-by-bar loop. Instead it uses an **element-wise array operation** model:

1. The full OHLCV series are exposed to the script as plain JavaScript arrays (`close`, `open`, `high`, `low`, `volume`).
2. All arithmetic operators (`+`, `-`, `*`, `/`) are replaced at transpile time with array-aware helpers (`_add`, `_sub`, `_mul`, `_div`) that operate element-wise when either operand is an array.
3. TA-Lib functions (SMA, EMA, RSI, etc.) take the full array and return a full output array.
4. The script function is constructed with `new Function(...)` and called once, producing complete output arrays for all plots.

This approach is simpler and faster than a per-bar loop for most Pine Script patterns, at the cost of not supporting stateful constructs like `var`, `varip`, or persistent cross-bar mutable state.

### Built-In Variables

| Variable | Type | Description |
|---|---|---|
| `open` | `number[]` | Open prices, one per candle |
| `high` | `number[]` | High prices |
| `low` | `number[]` | Low prices |
| `close` | `number[]` | Close prices |
| `volume` | `number[]` | Volume |
| `hl2` | `number[]` | `(high + low) / 2` |
| `hlc3` | `number[]` | `(high + low + close) / 3` |
| `ohlc4` | `number[]` | `(open + high + low + close) / 4` |
| `time` | `number[]` | Unix ms timestamps |
| `bar_index` | `number[]` | `[0, 1, 2, ..., n-1]` |
| `last_bar_index` | `number` | `candles.length - 1` |
| `timenow` | `number` | `Date.now()` at execution time |
| `na` | `NaN` | Pine's `na` constant |
| `barstate` | object | Always `{ ishistory: true, isrealtime: false, ... }` |

### Element-Wise Operator Helpers

These are injected into the execution context and called automatically by the transpiler. Pine Script expressions like `a + b` become `_add(a, b)`.

| Helper | Pine operator | Behavior |
|---|---|---|
| `_add(a, b)` | `a + b` | Element-wise if either is an array |
| `_sub(a, b)` | `a - b` | Element-wise if either is an array |
| `_mul(a, b)` | `a * b` | Element-wise if either is an array |
| `_div(a, b)` | `a / b` | Element-wise; returns `NaN` on divide-by-zero |
| `_gt(a, b)` | `a > b` | Returns `boolean[]` or `boolean` |
| `_lt(a, b)` | `a < b` | Returns `boolean[]` or `boolean` |
| `_gte(a, b)` | `a >= b` | Returns `boolean[]` or `boolean` |
| `_lte(a, b)` | `a <= b` | Returns `boolean[]` or `boolean` |
| `_eq(a, b)` | `a == b` | Returns `boolean[]` or `boolean` |
| `_neq(a, b)` | `a != b` | Returns `boolean[]` or `boolean` |
| `_and(a, b)` | `a and b` | Element-wise boolean AND |
| `_or(a, b)` | `a or b` | Element-wise boolean OR |
| `_not(a)` | `not a` | Element-wise boolean NOT |
| `_tern(c, a, b)` | `c ? a : b` | Element-wise ternary |
| `_lb(series, n)` | `series[n]` | Lookback: `result[i] = series[i - n]` (NaN for `i < n`) |

### Function Namespaces

#### `ta.*` — Technical Analysis (Pine v5+)

| Function | Description |
|---|---|
| `ta.sma(source, length)` | Simple Moving Average |
| `ta.ema(source, length)` | Exponential Moving Average |
| `ta.wma(source, length)` | Weighted Moving Average |
| `ta.rma(source, length)` | Wilder's Moving Average (RMA) |
| `ta.rsi(source, length)` | Relative Strength Index |
| `ta.macd(source, fast, slow, signal)` | MACD — returns `{ macd, signal, histogram }` |
| `ta.bb(source, length, mult)` | Bollinger Bands — returns `{ upper, middle, lower }` |
| `ta.atr(length)` | Average True Range (uses internal `high`, `low`, `close`) |
| `ta.stoch(close, high, low, length)` | Stochastic oscillator |
| `ta.stdev(source, length)` | Standard deviation |
| `ta.change(source, length?)` | Difference: `source[i] - source[i - length]` |
| `ta.mom(source, length)` | Momentum (same as `change`) |
| `ta.highest(source, length)` | Rolling highest value |
| `ta.lowest(source, length)` | Rolling lowest value |
| `ta.cross(a, b)` | `true` where `a` crosses `b` in either direction |
| `ta.crossover(a, b)` | `true` where `a` crosses above `b` |
| `ta.crossunder(a, b)` | `true` where `a` crosses below `b` |
| `ta.barssince(condition)` | Bars elapsed since `condition` was true |
| `ta.valuewhen(condition, source, occurrence)` | Value of `source` when `condition` was true N occurrences ago |
| `ta.cci(source, length)` | Commodity Channel Index (via TA-Lib) |
| `ta.mfi(source, length)` | Money Flow Index (via TA-Lib) |

#### Legacy bare functions (v4 compatibility, no namespace prefix)

All `ta.*` functions are also available without the `ta.` prefix: `sma()`, `ema()`, `rsi()`, `macd()`, `bb()`, `atr()`, `stoch()`, `stdev()`, `highest()`, `lowest()`, `crossover()`, `crossunder()`, `barssince()`, `valuewhen()`, `pivothigh()`, `pivotlow()`, `nz()`, `fixnan()`, `sum()`.

#### `math.*` — Mathematical functions

`math.abs`, `math.max`, `math.min`, `math.pow`, `math.sqrt`, `math.log`, `math.log10`, `math.exp`, `math.round`, `math.floor`, `math.ceil`, `math.sign`, `math.sin`, `math.cos`, `math.tan`, `math.asin`, `math.acos`, `math.atan`

All are direct aliases of their JavaScript `Math.*` counterparts.

#### `color.*` — Color utilities

`color.new(baseColor, transparency)`, `color.rgb(r, g, b, transp?)`, plus named constants: `color.red`, `color.green`, `color.blue`, `color.yellow`, `color.white`, `color.black`, `color.orange`, `color.purple`, `color.aqua`, `color.fuchsia`, `color.gray`, `color.lime`, `color.maroon`, `color.navy`, `color.olive`, `color.silver`, `color.teal`

#### `str.*` — String functions

`str.tostring(value)`, `str.format(formatStr, ...args)`, `str.length(str)`, `str.tonumber(str)`, `str.contains(source, str)`, `str.pos(source, str)`, `str.substring(source, begin, end?)`, `str.lower(str)`, `str.upper(str)`, `str.replace(source, target, replacement)`, `str.replace_all(source, target, replacement)`

#### `input.*` — Input declarations (execution time)

At execution time, `input()`, `input.int()`, `input.float()`, `input.bool()`, `input.string()`, `input.color()`, `input.source()`, and `input.timeframe()` all return their default value. Actual user-provided values are injected from the `settings` map supplied with the `execute` request.

### TA-Lib Direct Access

The `Indicators` class (used internally by the executor) wraps TA-Lib and exposes `indicators.execute(functionName, params)` for all 150+ TA-Lib functions. Many are also exposed directly in the execution context for use from Pine Script:

**Overlap studies:** `dema`, `kama`, `t3`, `tema`, `trima`, `ht_trendline`, `mama`, `mavp`, `midpoint`, `midprice`, `sar`, `sarext`, `accbands`

**Momentum indicators:** `adx`, `adxr`, `apo`, `aroon`, `aroonosc`, `bop`, `cci`, `cmo`, `dx`, `macdext`, `macdfix`, `mfi`, `minus_di`, `minus_dm`, `mom`, `plus_di`, `plus_dm`, `ppo`, `roc`, `rocp`, `rocr`, `rocr100`, `stochf`, `stochrsi`, `trix`, `ultosc`, `willr`

**Volume indicators:** `ad`, `adosc`, `obv`

**Volatility:** `natr`, `trange`

**Cycle indicators:** `ht_dcperiod`, `ht_dcphase`, `ht_phasor`, `ht_sine`, `ht_trendmode`

**Statistic functions:** `beta`, `correl`, `linearreg`, `linearreg_angle`, `linearreg_intercept`, `linearreg_slope`, `tsf`, `variance`

**Pattern recognition:** 61 candlestick patterns including `cdlengulfing`, `cdlhammer`, `cdldoji`, `cdlmorningstar`, `cdleveningstar`, and many others.

---

## Known Limitations

The runtime is a partial Pine Script implementation. The following are not supported:

| Feature | Status |
|---|---|
| `strategy.*` functions (`strategy.entry`, `strategy.exit`, etc.) | Not executed. The script parses but strategy calls are silently ignored. |
| `request.security()` | Not supported. Cross-symbol/timeframe data cannot be fetched. |
| `var` / `varip` persistent variables | Not supported. The execution model is stateless array operations; `var` declarations produce incorrect results. |
| `array.*` functions | Partially supported. Simple array creation and access may work in limited contexts; full Pine array API is not implemented. |
| `matrix.*` functions | Not supported. |
| `table.*` functions | Not supported. |
| `label.*` / `line.*` / `box.*` drawing objects | Not supported. |
| `alert()` / `alertcondition()` | Parsed and silently ignored. No alerts are fired. |
| `barstate.isrealtime` | Always `false` (the runtime does not distinguish history from realtime in the execution context). |
| Recursive user-defined functions | The function transpiler handles single-level indented bodies only. |

---

## Extending the Executor with New Functions

To add a new technical analysis function callable from Pine Script:

**Step 1:** Implement the calculation in `src/runtime/indicators.ts`:

```typescript
vwap(close: number[], volume: number[]): number[] {
  const result: number[] = []
  let cumPV = 0
  let cumV = 0
  for (let i = 0; i < close.length; i++) {
    cumPV += close[i] * volume[i]
    cumV  += volume[i]
    result.push(cumV > 0 ? cumPV / cumV : NaN)
  }
  return result
}
```

**Step 2:** Expose it in the `ta` namespace in `src/runtime/executor.ts` inside `createContext()`:

```typescript
ta: {
  // ... existing functions ...
  vwap: () => this.indicators.vwap(
    context.close as number[],
    context.volume as number[]
  ),
}
```

**Step 3:** Also add it to the legacy bare-function namespace if you want v4 scripts to use `vwap(...)` without the `ta.` prefix:

```typescript
// In createContext(), alongside existing bare functions:
vwap: () => this.indicators.vwap(
  context.close as number[],
  context.volume as number[]
),
```

**Step 4:** Restart the server. The new function is immediately available to any Pine Script executing through the server. No protocol changes are needed.

For complex functions backed by TA-Lib, use the `this.indicators.execute(functionName, params)` wrapper which sanitizes NaN inputs and handles errors safely:

```typescript
ta: {
  // ...
  myTalibFunc: (source: number[], period: number) => {
    return this.indicators.execute('SOME_TALIB_FUNC', {
      startIdx: 0,
      endIdx: source.length - 1,
      inReal: source,
      optInTimePeriod: period,
    }).result?.outReal || []
  },
}
```
