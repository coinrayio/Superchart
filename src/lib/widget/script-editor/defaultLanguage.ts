/**
 * Default Script Language - Pine-like syntax for trading indicators
 */

import type { ScriptLanguageDefinition } from '../../types/script'

export const defaultScriptLanguage: ScriptLanguageDefinition = {
  name: 'pine',
  extension: '.pine',

  keywords: [
    'if', 'else', 'for', 'while', 'break', 'continue', 'return',
    'var', 'varip', 'const', 'input', 'export',
    'indicator', 'strategy', 'library',
    'plot', 'plotshape', 'plotchar', 'plotarrow', 'plotcandle',
    'hline', 'fill', 'bgcolor',
    'alert', 'alertcondition',
    'true', 'false', 'na',
    'and', 'or', 'not',
    'import', 'as',
    'switch', 'type', 'method', 'enum',
  ],

  typeKeywords: [
    'int', 'float', 'bool', 'string', 'color',
    'series', 'simple', 'const',
    'array', 'matrix', 'map',
    'line', 'label', 'box', 'table',
  ],

  builtinFunctions: [
    // Moving Averages
    { name: 'sma', description: 'Simple Moving Average', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }], returnType: 'series' },
    { name: 'ema', description: 'Exponential Moving Average', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }], returnType: 'series' },
    { name: 'wma', description: 'Weighted Moving Average', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }], returnType: 'series' },
    { name: 'vwma', description: 'Volume Weighted Moving Average', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }], returnType: 'series' },
    { name: 'rma', description: 'Running Moving Average', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }], returnType: 'series' },

    // Oscillators
    { name: 'rsi', description: 'Relative Strength Index', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }], returnType: 'series' },
    { name: 'macd', description: 'MACD', parameters: [{ name: 'source', type: 'series' }, { name: 'fastLength', type: 'int' }, { name: 'slowLength', type: 'int' }, { name: 'signalLength', type: 'int' }], returnType: 'tuple' },
    { name: 'stoch', description: 'Stochastic', parameters: [{ name: 'close', type: 'series' }, { name: 'high', type: 'series' }, { name: 'low', type: 'series' }, { name: 'length', type: 'int' }], returnType: 'series' },
    { name: 'cci', description: 'Commodity Channel Index', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }], returnType: 'series' },
    { name: 'mfi', description: 'Money Flow Index', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }], returnType: 'series' },
    { name: 'atr', description: 'Average True Range', parameters: [{ name: 'length', type: 'int' }], returnType: 'series' },

    // Bands & Channels
    { name: 'bb', description: 'Bollinger Bands', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }, { name: 'mult', type: 'float' }], returnType: 'tuple' },
    { name: 'kc', description: 'Keltner Channels', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }, { name: 'mult', type: 'float' }], returnType: 'tuple' },

    // Crossover Detection
    { name: 'cross', description: 'Detect cross between two series', parameters: [{ name: 'a', type: 'series' }, { name: 'b', type: 'series' }], returnType: 'bool' },
    { name: 'crossover', description: 'Detect bullish crossover', parameters: [{ name: 'a', type: 'series' }, { name: 'b', type: 'series' }], returnType: 'bool' },
    { name: 'crossunder', description: 'Detect bearish crossunder', parameters: [{ name: 'a', type: 'series' }, { name: 'b', type: 'series' }], returnType: 'bool' },

    // Aggregation
    { name: 'highest', description: 'Highest value over N bars', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }], returnType: 'series' },
    { name: 'lowest', description: 'Lowest value over N bars', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }], returnType: 'series' },
    { name: 'sum', description: 'Sum over N bars', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }], returnType: 'series' },
    { name: 'avg', description: 'Average of values', parameters: [{ name: 'values', type: 'series...' }], returnType: 'series' },
    { name: 'stdev', description: 'Standard deviation', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }], returnType: 'series' },

    // Math
    { name: 'abs', description: 'Absolute value', parameters: [{ name: 'x', type: 'number' }], returnType: 'number' },
    { name: 'max', description: 'Maximum of two values', parameters: [{ name: 'a', type: 'number' }, { name: 'b', type: 'number' }], returnType: 'number' },
    { name: 'min', description: 'Minimum of two values', parameters: [{ name: 'a', type: 'number' }, { name: 'b', type: 'number' }], returnType: 'number' },
    { name: 'round', description: 'Round to nearest integer', parameters: [{ name: 'x', type: 'number' }], returnType: 'int' },
    { name: 'floor', description: 'Round down', parameters: [{ name: 'x', type: 'number' }], returnType: 'int' },
    { name: 'ceil', description: 'Round up', parameters: [{ name: 'x', type: 'number' }], returnType: 'int' },
    { name: 'pow', description: 'Power', parameters: [{ name: 'base', type: 'number' }, { name: 'exp', type: 'number' }], returnType: 'number' },
    { name: 'sqrt', description: 'Square root', parameters: [{ name: 'x', type: 'number' }], returnType: 'number' },
    { name: 'log', description: 'Natural logarithm', parameters: [{ name: 'x', type: 'number' }], returnType: 'number' },
    { name: 'log10', description: 'Base-10 logarithm', parameters: [{ name: 'x', type: 'number' }], returnType: 'number' },
    { name: 'exp', description: 'e^x', parameters: [{ name: 'x', type: 'number' }], returnType: 'number' },
    { name: 'sign', description: 'Sign of value (-1, 0, 1)', parameters: [{ name: 'x', type: 'number' }], returnType: 'int' },

    // Plotting
    { name: 'plot', description: 'Plot a series on the chart', parameters: [{ name: 'series', type: 'series' }, { name: 'title', type: 'string', optional: true }, { name: 'color', type: 'color', optional: true }, { name: 'linewidth', type: 'int', optional: true }], returnType: 'void' },
    { name: 'hline', description: 'Draw horizontal line', parameters: [{ name: 'price', type: 'float' }, { name: 'title', type: 'string', optional: true }, { name: 'color', type: 'color', optional: true }], returnType: 'void' },
    { name: 'fill', description: 'Fill between two plots', parameters: [{ name: 'plot1', type: 'plot' }, { name: 'plot2', type: 'plot' }, { name: 'color', type: 'color', optional: true }], returnType: 'void' },
    { name: 'bgcolor', description: 'Set background color', parameters: [{ name: 'color', type: 'color' }], returnType: 'void' },
    { name: 'barcolor', description: 'Set bar color', parameters: [{ name: 'color', type: 'color' }], returnType: 'void' },

    // Utility
    { name: 'nz', description: 'Replace NaN with value', parameters: [{ name: 'x', type: 'series' }, { name: 'replacement', type: 'number', optional: true }], returnType: 'series' },
    { name: 'fixnan', description: 'Replace NaN with last non-NaN', parameters: [{ name: 'x', type: 'series' }], returnType: 'series' },
    { name: 'na', description: 'Check if value is NaN', parameters: [{ name: 'x', type: 'series' }], returnType: 'bool' },
    { name: 'str', description: 'Convert to string', parameters: [{ name: 'x', type: 'number' }], returnType: 'string' },

    // Strategy
    { name: 'strategy.entry', description: 'Enter a position', parameters: [{ name: 'id', type: 'string' }, { name: 'direction', type: 'strategy.direction' }, { name: 'qty', type: 'float', optional: true }], returnType: 'void' },
    { name: 'strategy.close', description: 'Close a position', parameters: [{ name: 'id', type: 'string' }], returnType: 'void' },
    { name: 'strategy.exit', description: 'Set exit conditions', parameters: [{ name: 'id', type: 'string' }, { name: 'from_entry', type: 'string' }, { name: 'profit', type: 'float', optional: true }, { name: 'loss', type: 'float', optional: true }], returnType: 'void' },

    // TA-Lib Extended Indicators (100+ functions)
    // Math Operators
    { name: 'add', description: 'Vector Addition', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'div', description: 'Vector Division', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'mult', description: 'Vector Multiplication', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'sub', description: 'Vector Subtraction', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'maxindex', description: 'Index of highest value', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'minindex', description: 'Index of lowest value', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'minmax', description: 'Min and max values', parameters: [{ name: 'params', type: 'object' }], returnType: 'tuple' },
    { name: 'minmaxindex', description: 'Min and max indexes', parameters: [{ name: 'params', type: 'object' }], returnType: 'tuple' },

    // Math Transform
    { name: 'acos', description: 'Arc Cosine', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'asin', description: 'Arc Sine', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'atan', description: 'Arc Tangent', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'cos', description: 'Cosine', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'cosh', description: 'Hyperbolic Cosine', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'sin', description: 'Sine', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'sinh', description: 'Hyperbolic Sine', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'tan', description: 'Tangent', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'tanh', description: 'Hyperbolic Tangent', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'ln', description: 'Natural Logarithm', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },

    // Advanced Moving Averages
    { name: 'dema', description: 'Double Exponential MA', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'tema', description: 'Triple Exponential MA', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'trima', description: 'Triangular MA', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'kama', description: 'Kaufman Adaptive MA', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 't3', description: 'Triple Exponential MA T3', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'ma', description: 'Moving Average', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'mama', description: 'MESA Adaptive MA', parameters: [{ name: 'params', type: 'object' }], returnType: 'tuple' },
    { name: 'mavp', description: 'MA Variable Period', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'accbands', description: 'Acceleration Bands', parameters: [{ name: 'params', type: 'object' }], returnType: 'tuple' },
    { name: 'midpoint', description: 'MidPoint over period', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'midprice', description: 'Midpoint Price', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'sar', description: 'Parabolic SAR', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'sarext', description: 'Parabolic SAR Extended', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },

    // Hilbert Transform
    { name: 'ht_trendline', description: 'HT Instantaneous Trendline', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'ht_dcperiod', description: 'HT Dominant Cycle Period', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'ht_dcphase', description: 'HT Dominant Cycle Phase', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'ht_phasor', description: 'HT Phasor Components', parameters: [{ name: 'params', type: 'object' }], returnType: 'tuple' },
    { name: 'ht_sine', description: 'HT SineWave', parameters: [{ name: 'params', type: 'object' }], returnType: 'tuple' },
    { name: 'ht_trendmode', description: 'HT Trend vs Cycle Mode', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },

    // Volatility
    { name: 'natr', description: 'Normalized ATR', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'trange', description: 'True Range', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },

    // Momentum (Extended)
    { name: 'adx', description: 'Average Directional Index', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'adxr', description: 'ADX Rating', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'apo', description: 'Absolute Price Oscillator', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'aroon', description: 'Aroon', parameters: [{ name: 'params', type: 'object' }], returnType: 'tuple' },
    { name: 'aroonosc', description: 'Aroon Oscillator', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'bop', description: 'Balance Of Power', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'cmo', description: 'Chande Momentum Oscillator', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'dx', description: 'Directional Movement Index', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'imi', description: 'Intraday Momentum Index', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'macdext', description: 'MACD Extended', parameters: [{ name: 'params', type: 'object' }], returnType: 'tuple' },
    { name: 'macdfix', description: 'MACD Fix 12/26', parameters: [{ name: 'params', type: 'object' }], returnType: 'tuple' },
    { name: 'minus_di', description: 'Minus Directional Indicator', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'minus_dm', description: 'Minus Directional Movement', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'mom', description: 'Momentum', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'plus_di', description: 'Plus Directional Indicator', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'plus_dm', description: 'Plus Directional Movement', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'ppo', description: 'Percentage Price Oscillator', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'roc', description: 'Rate of Change', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'rocp', description: 'Rate of Change Percentage', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'rocr', description: 'Rate of Change Ratio', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'rocr100', description: 'Rate of Change Ratio 100', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'stochf', description: 'Stochastic Fast', parameters: [{ name: 'params', type: 'object' }], returnType: 'tuple' },
    { name: 'stochrsi', description: 'Stochastic RSI', parameters: [{ name: 'params', type: 'object' }], returnType: 'tuple' },
    { name: 'trix', description: 'Triple EMA Oscillator', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'ultosc', description: 'Ultimate Oscillator', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'willr', description: 'Williams %R', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },

    // Volume
    { name: 'ad', description: 'Accumulation/Distribution', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'adosc', description: 'AD Oscillator', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'obv', description: 'On Balance Volume', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },

    // Statistics
    { name: 'beta', description: 'Beta', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'correl', description: 'Correlation Coefficient', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'linearreg', description: 'Linear Regression', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'linearreg_angle', description: 'Linear Reg Angle', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'linearreg_intercept', description: 'Linear Reg Intercept', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'linearreg_slope', description: 'Linear Reg Slope', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'tsf', description: 'Time Series Forecast', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'var', description: 'Variance', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },

    // Price Transform
    { name: 'avgprice', description: 'Average Price', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'avgdev', description: 'Average Deviation', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'medprice', description: 'Median Price', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'typprice', description: 'Typical Price', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },
    { name: 'wclprice', description: 'Weighted Close Price', parameters: [{ name: 'params', type: 'object' }], returnType: 'series' },

    // Candlestick Patterns
    { name: 'cdl2crows', description: 'Two Crows', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdl3blackcrows', description: 'Three Black Crows', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdl3inside', description: 'Three Inside Up/Down', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdl3linestrike', description: 'Three-Line Strike', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdl3outside', description: 'Three Outside Up/Down', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdl3starsinsouth', description: 'Three Stars In South', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdl3whitesoldiers', description: 'Three Advancing White Soldiers', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlabandonedbaby', description: 'Abandoned Baby', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdladvanceblock', description: 'Advance Block', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlbelthold', description: 'Belt-hold', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlbreakaway', description: 'Breakaway', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlclosingmarubozu', description: 'Closing Marubozu', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlconcealbabyswall', description: 'Concealing Baby Swallow', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlcounterattack', description: 'Counterattack', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdldarkcloudcover', description: 'Dark Cloud Cover', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdldoji', description: 'Doji', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdldojistar', description: 'Doji Star', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdldragonflydoji', description: 'Dragonfly Doji', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlengulfing', description: 'Engulfing Pattern', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdleveningdojistar', description: 'Evening Doji Star', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdleveningstar', description: 'Evening Star', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlgapsidesidewhite', description: 'Up/Down Gap White Lines', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlgravestonedoji', description: 'Gravestone Doji', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlhammer', description: 'Hammer', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlhangingman', description: 'Hanging Man', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlharami', description: 'Harami Pattern', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlharamicross', description: 'Harami Cross', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlhighwave', description: 'High-Wave Candle', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlhikkake', description: 'Hikkake Pattern', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlhikkakemod', description: 'Modified Hikkake', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlhomingpigeon', description: 'Homing Pigeon', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlidentical3crows', description: 'Identical Three Crows', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlinneck', description: 'In-Neck Pattern', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlinvertedhammer', description: 'Inverted Hammer', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlkicking', description: 'Kicking', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlkickingbylength', description: 'Kicking by Length', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlladderbottom', description: 'Ladder Bottom', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdllongleggeddoji', description: 'Long Legged Doji', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdllongline', description: 'Long Line Candle', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlmarubozu', description: 'Marubozu', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlmatchinglow', description: 'Matching Low', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlmathold', description: 'Mat Hold', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlmorningdojistar', description: 'Morning Doji Star', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlmorningstar', description: 'Morning Star', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlonneck', description: 'On-Neck Pattern', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlpiercing', description: 'Piercing Pattern', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlrickshawman', description: 'Rickshaw Man', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlrisefall3methods', description: 'Rising/Falling Three Methods', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlseparatinglines', description: 'Separating Lines', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlshootingstar', description: 'Shooting Star', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlshortline', description: 'Short Line Candle', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlspinningtop', description: 'Spinning Top', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlstalledpattern', description: 'Stalled Pattern', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlsticksandwich', description: 'Stick Sandwich', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdltakuri', description: 'Takuri', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdltasukigap', description: 'Tasuki Gap', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlthrusting', description: 'Thrusting Pattern', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdltristar', description: 'Tristar Pattern', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlunique3river', description: 'Unique 3 River', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlupsidegap2crows', description: 'Upside Gap Two Crows', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
    { name: 'cdlxsidegap3methods', description: 'Upside/Downside Gap Three Methods', parameters: [{ name: 'params', type: 'object' }], returnType: 'int' },
  ],

  builtinVariables: [
    // Price data
    { name: 'open', description: 'Opening price', type: 'series' },
    { name: 'high', description: 'Highest price', type: 'series' },
    { name: 'low', description: 'Lowest price', type: 'series' },
    { name: 'close', description: 'Closing price', type: 'series' },
    { name: 'volume', description: 'Volume', type: 'series' },
    { name: 'hl2', description: '(high + low) / 2', type: 'series' },
    { name: 'hlc3', description: '(high + low + close) / 3', type: 'series' },
    { name: 'ohlc4', description: '(open + high + low + close) / 4', type: 'series' },

    // Time
    { name: 'time', description: 'Unix timestamp of bar', type: 'series' },
    { name: 'time_close', description: 'Close time of bar', type: 'series' },
    { name: 'bar_index', description: 'Current bar index', type: 'int' },
    { name: 'last_bar_index', description: 'Index of last bar', type: 'int' },
    { name: 'timenow', description: 'Current time', type: 'int' },

    // Symbol info
    { name: 'syminfo.ticker', description: 'Symbol ticker', type: 'string' },
    { name: 'syminfo.type', description: 'Symbol type', type: 'string' },
    { name: 'syminfo.mintick', description: 'Min price change', type: 'float' },
    { name: 'syminfo.pointvalue', description: 'Point value', type: 'float' },

    // Timeframe
    { name: 'timeframe.period', description: 'Current timeframe', type: 'string' },
    { name: 'timeframe.multiplier', description: 'Timeframe multiplier', type: 'int' },
    { name: 'timeframe.isintraday', description: 'Is intraday', type: 'bool' },
    { name: 'timeframe.isdaily', description: 'Is daily', type: 'bool' },
    { name: 'timeframe.isweekly', description: 'Is weekly', type: 'bool' },
    { name: 'timeframe.ismonthly', description: 'Is monthly', type: 'bool' },

    // Colors
    { name: 'color.red', description: 'Red color', type: 'color' },
    { name: 'color.green', description: 'Green color', type: 'color' },
    { name: 'color.blue', description: 'Blue color', type: 'color' },
    { name: 'color.yellow', description: 'Yellow color', type: 'color' },
    { name: 'color.white', description: 'White color', type: 'color' },
    { name: 'color.black', description: 'Black color', type: 'color' },
    { name: 'color.orange', description: 'Orange color', type: 'color' },
    { name: 'color.purple', description: 'Purple color', type: 'color' },
    { name: 'color.aqua', description: 'Aqua color', type: 'color' },

    // Strategy
    { name: 'strategy.long', description: 'Long direction', type: 'strategy.direction' },
    { name: 'strategy.short', description: 'Short direction', type: 'strategy.direction' },
    { name: 'strategy.position_size', description: 'Current position size', type: 'float' },
    { name: 'strategy.equity', description: 'Strategy equity', type: 'float' },
    { name: 'strategy.netprofit', description: 'Net profit', type: 'float' },
  ],

  comments: {
    line: '//',
    blockStart: '/*',
    blockEnd: '*/',
  },

  operators: [
    '+', '-', '*', '/', '%',
    '==', '!=', '>', '<', '>=', '<=',
    '=', ':=', '+=', '-=', '*=', '/=',
    '?', ':',
    '=>',
  ],

  stringDelimiters: ['"', "'"],
}

export default defaultScriptLanguage
