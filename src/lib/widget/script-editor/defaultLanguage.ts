/**
 * Default Script Language - Pine-like syntax for trading indicators
 */

import type { ScriptLanguageDefinition } from '../../types/script'

export const defaultScriptLanguage: ScriptLanguageDefinition = {
  name: 'pine',
  extension: '.pine',

  keywords: [
    // Control flow
    'if', 'else', 'for', 'while', 'break', 'continue', 'return',
    'switch', 'case', 'default',
    // Variable declaration
    'var', 'varip',
    // Boolean and null literals
    'true', 'false', 'na',
    // Logical operators
    'and', 'or', 'not',
    // Import/export
    'import', 'export', 'as',
    // Type system (rarely used)
    'type', 'method', 'enum',
  ],

  typeKeywords: [
    // Type qualifiers (used in Pine Script type system)
    'series', 'simple', 'const',
    // Note: int, float, bool, string, color are NOT keywords in Pine Script v5
    // They are inferred types, not declaration keywords
  ],

  builtinFunctions: [
    // Pine Script Declaration Functions (v4/v5/v6)
    { name: 'indicator', description: 'Declare an indicator script', parameters: [{ name: 'title', type: 'string' }, { name: 'shorttitle', type: 'string', optional: true }, { name: 'overlay', type: 'bool', optional: true }, { name: 'format', type: 'string', optional: true }, { name: 'precision', type: 'int', optional: true }, { name: 'timeframe', type: 'string', optional: true }, { name: 'timeframe_gaps', type: 'bool', optional: true }], returnType: 'void' },
    { name: 'study', description: 'Declare an indicator script (v4)', parameters: [{ name: 'title', type: 'string' }, { name: 'shorttitle', type: 'string', optional: true }, { name: 'overlay', type: 'bool', optional: true }, { name: 'format', type: 'string', optional: true }, { name: 'precision', type: 'int', optional: true }, { name: 'resolution', type: 'string', optional: true }, { name: 'scale', type: 'string', optional: true }], returnType: 'void' },
    { name: 'strategy', description: 'Declare a strategy script', parameters: [{ name: 'title', type: 'string' }, { name: 'shorttitle', type: 'string', optional: true }, { name: 'overlay', type: 'bool', optional: true }, { name: 'calc_on_every_tick', type: 'bool', optional: true }, { name: 'calc_on_order_fills', type: 'bool', optional: true }], returnType: 'void' },
    { name: 'library', description: 'Declare a library script', parameters: [{ name: 'title', type: 'string' }], returnType: 'void' },

    // Input Functions
    // Bare input() for v4 compatibility
    { name: 'input', description: 'Generic input (v4)', parameters: [{ name: 'defval', type: 'any' }, { name: 'title', type: 'string', optional: true }, { name: 'type', type: 'string', optional: true }, { name: 'minval', type: 'number', optional: true }, { name: 'maxval', type: 'number', optional: true }, { name: 'step', type: 'number', optional: true }, { name: 'options', type: 'array', optional: true }, { name: 'tooltip', type: 'string', optional: true }, { name: 'confirm', type: 'bool', optional: true }], returnType: 'any' },
    // Pine Script v5+
    { name: 'input.int', description: 'Integer input', parameters: [{ name: 'defval', type: 'int' }, { name: 'title', type: 'string', optional: true }, { name: 'minval', type: 'int', optional: true }, { name: 'maxval', type: 'int', optional: true }, { name: 'step', type: 'int', optional: true }, { name: 'tooltip', type: 'string', optional: true }], returnType: 'int' },
    { name: 'input.float', description: 'Float input', parameters: [{ name: 'defval', type: 'float' }, { name: 'title', type: 'string', optional: true }, { name: 'minval', type: 'float', optional: true }, { name: 'maxval', type: 'float', optional: true }, { name: 'step', type: 'float', optional: true }], returnType: 'float' },
    { name: 'input.bool', description: 'Boolean input', parameters: [{ name: 'defval', type: 'bool' }, { name: 'title', type: 'string', optional: true }, { name: 'tooltip', type: 'string', optional: true }], returnType: 'bool' },
    { name: 'input.string', description: 'String input', parameters: [{ name: 'defval', type: 'string' }, { name: 'title', type: 'string', optional: true }, { name: 'options', type: 'array', optional: true }], returnType: 'string' },
    { name: 'input.color', description: 'Color input', parameters: [{ name: 'defval', type: 'color' }, { name: 'title', type: 'string', optional: true }], returnType: 'color' },
    { name: 'input.source', description: 'Source input', parameters: [{ name: 'defval', type: 'series' }, { name: 'title', type: 'string', optional: true }], returnType: 'series' },
    { name: 'input.timeframe', description: 'Timeframe input', parameters: [{ name: 'defval', type: 'string' }, { name: 'title', type: 'string', optional: true }], returnType: 'string' },
    { name: 'input.symbol', description: 'Symbol input', parameters: [{ name: 'defval', type: 'string' }, { name: 'title', type: 'string', optional: true }], returnType: 'string' },

    // Technical Analysis Functions (Pine Script v5 ta.* namespace)
    { name: 'ta.sma', description: 'Simple Moving Average', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }], returnType: 'series' },
    { name: 'ta.ema', description: 'Exponential Moving Average', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }], returnType: 'series' },
    { name: 'ta.wma', description: 'Weighted Moving Average', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }], returnType: 'series' },
    { name: 'ta.vwma', description: 'Volume Weighted Moving Average', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }], returnType: 'series' },
    { name: 'ta.rma', description: 'Running Moving Average', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }], returnType: 'series' },
    { name: 'ta.rsi', description: 'Relative Strength Index', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }], returnType: 'series' },
    { name: 'ta.macd', description: 'MACD', parameters: [{ name: 'source', type: 'series' }, { name: 'fastLength', type: 'int' }, { name: 'slowLength', type: 'int' }, { name: 'signalLength', type: 'int' }], returnType: 'tuple' },
    { name: 'ta.stoch', description: 'Stochastic', parameters: [{ name: 'source', type: 'series' }, { name: 'high', type: 'series' }, { name: 'low', type: 'series' }, { name: 'length', type: 'int' }], returnType: 'series' },
    { name: 'ta.cci', description: 'Commodity Channel Index', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }], returnType: 'series' },
    { name: 'ta.atr', description: 'Average True Range', parameters: [{ name: 'length', type: 'int' }], returnType: 'series' },
    { name: 'ta.bb', description: 'Bollinger Bands', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }, { name: 'mult', type: 'float' }], returnType: 'tuple' },
    { name: 'ta.cross', description: 'Detect cross between two series', parameters: [{ name: 'a', type: 'series' }, { name: 'b', type: 'series' }], returnType: 'bool' },
    { name: 'ta.crossover', description: 'Detect bullish crossover', parameters: [{ name: 'a', type: 'series' }, { name: 'b', type: 'series' }], returnType: 'bool' },
    { name: 'ta.crossunder', description: 'Detect bearish crossunder', parameters: [{ name: 'a', type: 'series' }, { name: 'b', type: 'series' }], returnType: 'bool' },
    { name: 'ta.highest', description: 'Highest value over N bars', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }], returnType: 'series' },
    { name: 'ta.lowest', description: 'Lowest value over N bars', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }], returnType: 'series' },
    { name: 'ta.change', description: 'Difference between current and previous value', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int', optional: true }], returnType: 'series' },
    { name: 'ta.mom', description: 'Momentum', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }], returnType: 'series' },
    { name: 'ta.stdev', description: 'Standard deviation', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }], returnType: 'series' },
    { name: 'ta.variance', description: 'Variance', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }], returnType: 'series' },
    { name: 'ta.percentile_linear_interpolation', description: 'Percentile using linear interpolation', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }, { name: 'percentage', type: 'float' }], returnType: 'series' },
    { name: 'ta.percentile_nearest_rank', description: 'Percentile using nearest rank', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }, { name: 'percentage', type: 'float' }], returnType: 'series' },
    { name: 'ta.median', description: 'Median value', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }], returnType: 'series' },
    { name: 'ta.mode', description: 'Mode value (most frequent)', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }], returnType: 'series' },
    { name: 'ta.range', description: 'Difference between highest and lowest', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }], returnType: 'series' },
    { name: 'ta.pivothigh', description: 'Pivot high detection', parameters: [{ name: 'source', type: 'series' }, { name: 'leftbars', type: 'int' }, { name: 'rightbars', type: 'int' }], returnType: 'series' },
    { name: 'ta.pivotlow', description: 'Pivot low detection', parameters: [{ name: 'source', type: 'series' }, { name: 'leftbars', type: 'int' }, { name: 'rightbars', type: 'int' }], returnType: 'series' },
    { name: 'ta.barssince', description: 'Bars since condition was true', parameters: [{ name: 'condition', type: 'bool' }], returnType: 'int' },
    { name: 'ta.valuewhen', description: 'Value when condition was true', parameters: [{ name: 'condition', type: 'bool' }, { name: 'source', type: 'series' }, { name: 'occurrence', type: 'int' }], returnType: 'series' },
    { name: 'ta.tr', description: 'True Range', parameters: [{ name: 'handle_na', type: 'bool', optional: true }], returnType: 'series' },
    { name: 'ta.sma', description: 'Simple Moving Average', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }], returnType: 'series' },
    { name: 'ta.alma', description: 'Arnaud Legoux Moving Average', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }, { name: 'offset', type: 'float', optional: true }, { name: 'sigma', type: 'float', optional: true }], returnType: 'series' },
    { name: 'ta.swma', description: 'Symmetrically Weighted Moving Average', parameters: [{ name: 'source', type: 'series' }], returnType: 'series' },
    { name: 'ta.hma', description: 'Hull Moving Average', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }], returnType: 'series' },
    { name: 'ta.linreg', description: 'Linear Regression', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }, { name: 'offset', type: 'int' }], returnType: 'series' },
    { name: 'ta.wpr', description: 'Williams %R', parameters: [{ name: 'length', type: 'int' }], returnType: 'series' },
    { name: 'ta.mfi', description: 'Money Flow Index', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }], returnType: 'series' },
    { name: 'ta.obv', description: 'On Balance Volume', parameters: [], returnType: 'series' },
    { name: 'ta.sar', description: 'Parabolic SAR', parameters: [{ name: 'start', type: 'float' }, { name: 'increment', type: 'float' }, { name: 'maximum', type: 'float' }], returnType: 'series' },
    { name: 'ta.supertrend', description: 'SuperTrend', parameters: [{ name: 'factor', type: 'float' }, { name: 'atrPeriod', type: 'int' }], returnType: 'tuple' },
    { name: 'ta.kc', description: 'Keltner Channels', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }, { name: 'mult', type: 'float' }], returnType: 'tuple' },
    { name: 'ta.dmi', description: 'Directional Movement Index', parameters: [{ name: 'diLength', type: 'int' }, { name: 'adxSmoothing', type: 'int' }], returnType: 'tuple' },
    { name: 'ta.cog', description: 'Center of Gravity', parameters: [{ name: 'source', type: 'series' }, { name: 'length', type: 'int' }], returnType: 'series' },

    // Plotting Functions
    { name: 'plot', description: 'Plot a series on the chart', parameters: [{ name: 'series', type: 'series' }, { name: 'title', type: 'string', optional: true }, { name: 'color', type: 'color', optional: true }, { name: 'linewidth', type: 'int', optional: true }, { name: 'style', type: 'string', optional: true }, { name: 'trackprice', type: 'bool', optional: true }, { name: 'histbase', type: 'float', optional: true }, { name: 'offset', type: 'int', optional: true }, { name: 'join', type: 'bool', optional: true }, { name: 'editable', type: 'bool', optional: true }, { name: 'show_last', type: 'int', optional: true }, { name: 'display', type: 'string', optional: true }, { name: 'transp', type: 'int', optional: true }], returnType: 'plot' },
    { name: 'plotshape', description: 'Plot shapes', parameters: [{ name: 'series', type: 'bool' }, { name: 'title', type: 'string', optional: true }, { name: 'style', type: 'string', optional: true }, { name: 'location', type: 'string', optional: true }, { name: 'color', type: 'color', optional: true }, { name: 'offset', type: 'int', optional: true }, { name: 'text', type: 'string', optional: true }, { name: 'textcolor', type: 'color', optional: true }, { name: 'editable', type: 'bool', optional: true }, { name: 'size', type: 'string', optional: true }, { name: 'show_last', type: 'int', optional: true }, { name: 'display', type: 'string', optional: true }, { name: 'transp', type: 'int', optional: true }], returnType: 'void' },
    { name: 'plotchar', description: 'Plot character', parameters: [{ name: 'series', type: 'bool' }, { name: 'title', type: 'string', optional: true }, { name: 'char', type: 'string', optional: true }, { name: 'location', type: 'string', optional: true }, { name: 'color', type: 'color', optional: true }, { name: 'offset', type: 'int', optional: true }, { name: 'text', type: 'string', optional: true }, { name: 'textcolor', type: 'color', optional: true }, { name: 'editable', type: 'bool', optional: true }, { name: 'size', type: 'string', optional: true }, { name: 'show_last', type: 'int', optional: true }], returnType: 'void' },
    { name: 'plotarrow', description: 'Plot arrows', parameters: [{ name: 'series', type: 'series' }, { name: 'title', type: 'string', optional: true }, { name: 'colorup', type: 'color', optional: true }, { name: 'colordown', type: 'color', optional: true }, { name: 'offset', type: 'int', optional: true }, { name: 'minheight', type: 'int', optional: true }, { name: 'maxheight', type: 'int', optional: true }, { name: 'editable', type: 'bool', optional: true }, { name: 'show_last', type: 'int', optional: true }], returnType: 'void' },
    { name: 'plotcandle', description: 'Plot candles', parameters: [{ name: 'open', type: 'series' }, { name: 'high', type: 'series' }, { name: 'low', type: 'series' }, { name: 'close', type: 'series' }, { name: 'title', type: 'string', optional: true }, { name: 'color', type: 'color', optional: true }, { name: 'wickcolor', type: 'color', optional: true }, { name: 'editable', type: 'bool', optional: true }, { name: 'show_last', type: 'int', optional: true }, { name: 'bordercolor', type: 'color', optional: true }], returnType: 'void' },
    { name: 'hline', description: 'Draw horizontal line', parameters: [{ name: 'price', type: 'float' }, { name: 'title', type: 'string', optional: true }, { name: 'color', type: 'color', optional: true }, { name: 'linestyle', type: 'string', optional: true }, { name: 'linewidth', type: 'int', optional: true }, { name: 'editable', type: 'bool', optional: true }, { name: 'display', type: 'string', optional: true }], returnType: 'hline' },
    { name: 'fill', description: 'Fill between two plots', parameters: [{ name: 'plot1', type: 'plot' }, { name: 'plot2', type: 'plot' }, { name: 'color', type: 'color', optional: true }, { name: 'title', type: 'string', optional: true }, { name: 'editable', type: 'bool', optional: true }, { name: 'show_last', type: 'int', optional: true }, { name: 'fillgaps', type: 'bool', optional: true }, { name: 'transp', type: 'int', optional: true }], returnType: 'void' },
    { name: 'bgcolor', description: 'Set background color', parameters: [{ name: 'color', type: 'color' }, { name: 'offset', type: 'int', optional: true }, { name: 'editable', type: 'bool', optional: true }, { name: 'show_last', type: 'int', optional: true }, { name: 'title', type: 'string', optional: true }, { name: 'display', type: 'string', optional: true }, { name: 'transp', type: 'int', optional: true }], returnType: 'void' },
    { name: 'barcolor', description: 'Set bar color', parameters: [{ name: 'color', type: 'color' }, { name: 'offset', type: 'int', optional: true }, { name: 'editable', type: 'bool', optional: true }, { name: 'show_last', type: 'int', optional: true }, { name: 'title', type: 'string', optional: true }], returnType: 'void' },

    // Alert Functions
    { name: 'alert', description: 'Trigger alert', parameters: [{ name: 'message', type: 'string' }, { name: 'freq', type: 'string', optional: true }], returnType: 'void' },
    { name: 'alertcondition', description: 'Create alert condition', parameters: [{ name: 'condition', type: 'bool' }, { name: 'title', type: 'string', optional: true }, { name: 'message', type: 'string', optional: true }], returnType: 'void' },

    // Color Functions
    { name: 'color.rgb', description: 'Create RGB color', parameters: [{ name: 'red', type: 'int' }, { name: 'green', type: 'int' }, { name: 'blue', type: 'int' }, { name: 'transp', type: 'int', optional: true }], returnType: 'color' },
    { name: 'color.new', description: 'Create color with transparency', parameters: [{ name: 'color', type: 'color' }, { name: 'transp', type: 'int' }], returnType: 'color' },
    { name: 'color.from_gradient', description: 'Get color from gradient', parameters: [{ name: 'value', type: 'float' }, { name: 'bottom_value', type: 'float' }, { name: 'top_value', type: 'float' }, { name: 'bottom_color', type: 'color' }, { name: 'top_color', type: 'color' }], returnType: 'color' },

    // Math Functions
    { name: 'math.abs', description: 'Absolute value', parameters: [{ name: 'x', type: 'number' }], returnType: 'number' },
    { name: 'math.max', description: 'Maximum value', parameters: [{ name: 'a', type: 'number' }, { name: 'b', type: 'number' }], returnType: 'number' },
    { name: 'math.min', description: 'Minimum value', parameters: [{ name: 'a', type: 'number' }, { name: 'b', type: 'number' }], returnType: 'number' },
    { name: 'math.round', description: 'Round to nearest integer', parameters: [{ name: 'x', type: 'number' }, { name: 'precision', type: 'int', optional: true }], returnType: 'number' },
    { name: 'math.floor', description: 'Round down', parameters: [{ name: 'x', type: 'number' }], returnType: 'int' },
    { name: 'math.ceil', description: 'Round up', parameters: [{ name: 'x', type: 'number' }], returnType: 'int' },
    { name: 'math.pow', description: 'Power', parameters: [{ name: 'base', type: 'number' }, { name: 'exp', type: 'number' }], returnType: 'number' },
    { name: 'math.sqrt', description: 'Square root', parameters: [{ name: 'x', type: 'number' }], returnType: 'number' },
    { name: 'math.log', description: 'Natural logarithm', parameters: [{ name: 'x', type: 'number' }], returnType: 'number' },
    { name: 'math.log10', description: 'Base-10 logarithm', parameters: [{ name: 'x', type: 'number' }], returnType: 'number' },
    { name: 'math.exp', description: 'e^x', parameters: [{ name: 'x', type: 'number' }], returnType: 'number' },
    { name: 'math.sign', description: 'Sign of value (-1, 0, 1)', parameters: [{ name: 'x', type: 'number' }], returnType: 'int' },

    // String Functions
    { name: 'str.tostring', description: 'Convert to string', parameters: [{ name: 'value', type: 'any' }, { name: 'format', type: 'string', optional: true }], returnType: 'string' },
    { name: 'str.format', description: 'Format string', parameters: [{ name: 'formatString', type: 'string' }], returnType: 'string' },
    { name: 'str.length', description: 'String length', parameters: [{ name: 'string', type: 'string' }], returnType: 'int' },
    { name: 'str.tonumber', description: 'Convert string to number', parameters: [{ name: 'string', type: 'string' }], returnType: 'float' },
    { name: 'str.contains', description: 'Check if string contains substring', parameters: [{ name: 'source', type: 'string' }, { name: 'str', type: 'string' }], returnType: 'bool' },
    { name: 'str.pos', description: 'Find position of substring', parameters: [{ name: 'source', type: 'string' }, { name: 'str', type: 'string' }], returnType: 'int' },
    { name: 'str.substring', description: 'Extract substring', parameters: [{ name: 'source', type: 'string' }, { name: 'begin_pos', type: 'int' }, { name: 'end_pos', type: 'int', optional: true }], returnType: 'string' },
    { name: 'str.lower', description: 'Convert to lowercase', parameters: [{ name: 'source', type: 'string' }], returnType: 'string' },
    { name: 'str.upper', description: 'Convert to uppercase', parameters: [{ name: 'source', type: 'string' }], returnType: 'string' },
    { name: 'str.replace', description: 'Replace substring', parameters: [{ name: 'source', type: 'string' }, { name: 'target', type: 'string' }, { name: 'replacement', type: 'string' }], returnType: 'string' },
    { name: 'str.replace_all', description: 'Replace all occurrences', parameters: [{ name: 'source', type: 'string' }, { name: 'target', type: 'string' }, { name: 'replacement', type: 'string' }], returnType: 'string' },
    { name: 'str.split', description: 'Split string by separator', parameters: [{ name: 'string', type: 'string' }, { name: 'separator', type: 'string' }], returnType: 'array' },

    // Array Functions (Pine v5+)
    { name: 'array.new_int', description: 'Create new integer array', parameters: [{ name: 'size', type: 'int', optional: true }, { name: 'initial_value', type: 'int', optional: true }], returnType: 'array' },
    { name: 'array.new_float', description: 'Create new float array', parameters: [{ name: 'size', type: 'int', optional: true }, { name: 'initial_value', type: 'float', optional: true }], returnType: 'array' },
    { name: 'array.new_bool', description: 'Create new boolean array', parameters: [{ name: 'size', type: 'int', optional: true }, { name: 'initial_value', type: 'bool', optional: true }], returnType: 'array' },
    { name: 'array.new_string', description: 'Create new string array', parameters: [{ name: 'size', type: 'int', optional: true }, { name: 'initial_value', type: 'string', optional: true }], returnType: 'array' },
    { name: 'array.new_color', description: 'Create new color array', parameters: [{ name: 'size', type: 'int', optional: true }, { name: 'initial_value', type: 'color', optional: true }], returnType: 'array' },
    { name: 'array.from', description: 'Create array from arguments', parameters: [{ name: 'arg0', type: 'any' }], returnType: 'array' },
    { name: 'array.push', description: 'Add element to end of array', parameters: [{ name: 'id', type: 'array' }, { name: 'value', type: 'any' }], returnType: 'void' },
    { name: 'array.pop', description: 'Remove and return last element', parameters: [{ name: 'id', type: 'array' }], returnType: 'any' },
    { name: 'array.shift', description: 'Remove and return first element', parameters: [{ name: 'id', type: 'array' }], returnType: 'any' },
    { name: 'array.unshift', description: 'Add element to start of array', parameters: [{ name: 'id', type: 'array' }, { name: 'value', type: 'any' }], returnType: 'void' },
    { name: 'array.get', description: 'Get element at index', parameters: [{ name: 'id', type: 'array' }, { name: 'index', type: 'int' }], returnType: 'any' },
    { name: 'array.set', description: 'Set element at index', parameters: [{ name: 'id', type: 'array' }, { name: 'index', type: 'int' }, { name: 'value', type: 'any' }], returnType: 'void' },
    { name: 'array.size', description: 'Get array size', parameters: [{ name: 'id', type: 'array' }], returnType: 'int' },
    { name: 'array.clear', description: 'Remove all elements', parameters: [{ name: 'id', type: 'array' }], returnType: 'void' },
    { name: 'array.concat', description: 'Concatenate arrays', parameters: [{ name: 'id1', type: 'array' }, { name: 'id2', type: 'array' }], returnType: 'void' },
    { name: 'array.copy', description: 'Create array copy', parameters: [{ name: 'id', type: 'array' }], returnType: 'array' },
    { name: 'array.includes', description: 'Check if array contains value', parameters: [{ name: 'id', type: 'array' }, { name: 'value', type: 'any' }], returnType: 'bool' },
    { name: 'array.indexof', description: 'Find index of value', parameters: [{ name: 'id', type: 'array' }, { name: 'value', type: 'any' }], returnType: 'int' },
    { name: 'array.join', description: 'Join array elements into string', parameters: [{ name: 'id', type: 'array' }, { name: 'separator', type: 'string' }], returnType: 'string' },
    { name: 'array.max', description: 'Get maximum value', parameters: [{ name: 'id', type: 'array' }], returnType: 'any' },
    { name: 'array.min', description: 'Get minimum value', parameters: [{ name: 'id', type: 'array' }], returnType: 'any' },
    { name: 'array.sum', description: 'Sum of all elements', parameters: [{ name: 'id', type: 'array' }], returnType: 'any' },
    { name: 'array.avg', description: 'Average of all elements', parameters: [{ name: 'id', type: 'array' }], returnType: 'float' },
    { name: 'array.sort', description: 'Sort array', parameters: [{ name: 'id', type: 'array' }, { name: 'order', type: 'string', optional: true }], returnType: 'void' },
    { name: 'array.reverse', description: 'Reverse array', parameters: [{ name: 'id', type: 'array' }], returnType: 'void' },
    { name: 'array.slice', description: 'Extract array slice', parameters: [{ name: 'id', type: 'array' }, { name: 'index_from', type: 'int' }, { name: 'index_to', type: 'int' }], returnType: 'array' },

    // Request Functions (for multi-timeframe and security data)
    { name: 'request.security', description: 'Request data from another symbol/timeframe', parameters: [{ name: 'symbol', type: 'string' }, { name: 'timeframe', type: 'string' }, { name: 'expression', type: 'any' }], returnType: 'series' },
    { name: 'request.dividends', description: 'Request dividends data', parameters: [{ name: 'ticker', type: 'string' }, { name: 'field', type: 'string' }, { name: 'gaps', type: 'string' }], returnType: 'series' },
    { name: 'request.earnings', description: 'Request earnings data', parameters: [{ name: 'ticker', type: 'string' }, { name: 'field', type: 'string' }, { name: 'gaps', type: 'string' }], returnType: 'series' },
    { name: 'request.financial', description: 'Request financial data', parameters: [{ name: 'symbol', type: 'string' }, { name: 'financial_id', type: 'string' }, { name: 'period', type: 'string' }], returnType: 'series' },
    { name: 'request.splits', description: 'Request stock splits data', parameters: [{ name: 'ticker', type: 'string' }, { name: 'field', type: 'string' }, { name: 'gaps', type: 'string' }], returnType: 'series' },

    // Timeframe Functions
    { name: 'timeframe.in_seconds', description: 'Convert timeframe to seconds', parameters: [{ name: 'timeframe', type: 'string', optional: true }], returnType: 'int' },
    { name: 'timeframe.from_seconds', description: 'Convert seconds to timeframe string', parameters: [{ name: 'seconds', type: 'int' }], returnType: 'string' },

    // Drawing Objects - Label Functions
    { name: 'label.new', description: 'Create new label', parameters: [{ name: 'x', type: 'int' }, { name: 'y', type: 'float' }, { name: 'text', type: 'string', optional: true }, { name: 'xloc', type: 'string', optional: true }, { name: 'yloc', type: 'string', optional: true }, { name: 'color', type: 'color', optional: true }, { name: 'style', type: 'string', optional: true }, { name: 'textcolor', type: 'color', optional: true }, { name: 'size', type: 'string', optional: true }], returnType: 'label' },
    { name: 'label.delete', description: 'Delete a label', parameters: [{ name: 'id', type: 'label' }], returnType: 'void' },
    { name: 'label.set_x', description: 'Set label X coordinate', parameters: [{ name: 'id', type: 'label' }, { name: 'x', type: 'int' }], returnType: 'void' },
    { name: 'label.set_y', description: 'Set label Y coordinate', parameters: [{ name: 'id', type: 'label' }, { name: 'y', type: 'float' }], returnType: 'void' },
    { name: 'label.set_text', description: 'Set label text', parameters: [{ name: 'id', type: 'label' }, { name: 'text', type: 'string' }], returnType: 'void' },
    { name: 'label.set_color', description: 'Set label color', parameters: [{ name: 'id', type: 'label' }, { name: 'color', type: 'color' }], returnType: 'void' },
    { name: 'label.set_textcolor', description: 'Set label text color', parameters: [{ name: 'id', type: 'label' }, { name: 'color', type: 'color' }], returnType: 'void' },
    { name: 'label.set_style', description: 'Set label style', parameters: [{ name: 'id', type: 'label' }, { name: 'style', type: 'string' }], returnType: 'void' },
    { name: 'label.set_size', description: 'Set label size', parameters: [{ name: 'id', type: 'label' }, { name: 'size', type: 'string' }], returnType: 'void' },

    // Drawing Objects - Line Functions
    { name: 'line.new', description: 'Create new line', parameters: [{ name: 'x1', type: 'int' }, { name: 'y1', type: 'float' }, { name: 'x2', type: 'int' }, { name: 'y2', type: 'float' }, { name: 'xloc', type: 'string', optional: true }, { name: 'extend', type: 'string', optional: true }, { name: 'color', type: 'color', optional: true }, { name: 'style', type: 'string', optional: true }, { name: 'width', type: 'int', optional: true }], returnType: 'line' },
    { name: 'line.delete', description: 'Delete a line', parameters: [{ name: 'id', type: 'line' }], returnType: 'void' },
    { name: 'line.set_x1', description: 'Set line X1 coordinate', parameters: [{ name: 'id', type: 'line' }, { name: 'x', type: 'int' }], returnType: 'void' },
    { name: 'line.set_y1', description: 'Set line Y1 coordinate', parameters: [{ name: 'id', type: 'line' }, { name: 'y', type: 'float' }], returnType: 'void' },
    { name: 'line.set_x2', description: 'Set line X2 coordinate', parameters: [{ name: 'id', type: 'line' }, { name: 'x', type: 'int' }], returnType: 'void' },
    { name: 'line.set_y2', description: 'Set line Y2 coordinate', parameters: [{ name: 'id', type: 'line' }, { name: 'y', type: 'float' }], returnType: 'void' },
    { name: 'line.set_color', description: 'Set line color', parameters: [{ name: 'id', type: 'line' }, { name: 'color', type: 'color' }], returnType: 'void' },
    { name: 'line.set_width', description: 'Set line width', parameters: [{ name: 'id', type: 'line' }, { name: 'width', type: 'int' }], returnType: 'void' },
    { name: 'line.set_style', description: 'Set line style', parameters: [{ name: 'id', type: 'line' }, { name: 'style', type: 'string' }], returnType: 'void' },
    { name: 'line.set_extend', description: 'Set line extension', parameters: [{ name: 'id', type: 'line' }, { name: 'extend', type: 'string' }], returnType: 'void' },

    // Utility Functions
    { name: 'barssince', description: 'Bars since condition was true', parameters: [{ name: 'condition', type: 'bool' }], returnType: 'int' },
    { name: 'valuewhen', description: 'Value when condition was true', parameters: [{ name: 'condition', type: 'bool' }, { name: 'source', type: 'series' }, { name: 'occurrence', type: 'int' }], returnType: 'series' },
    { name: 'pivothigh', description: 'Detect pivot high', parameters: [{ name: 'source', type: 'series' }, { name: 'leftbars', type: 'int' }, { name: 'rightbars', type: 'int' }], returnType: 'series' },
    { name: 'pivotlow', description: 'Detect pivot low', parameters: [{ name: 'source', type: 'series' }, { name: 'leftbars', type: 'int' }, { name: 'rightbars', type: 'int' }], returnType: 'series' },

    // Legacy Functions (for backwards compatibility)
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

    // Plotting (legacy - redirects to v5 definitions above, but kept for duplicate-name resolution)
    // Note: The linter uses the FIRST match, so these won't shadow the v5 definitions above

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
    // Pine Script v5/v6 Namespaces
    { name: 'input', description: 'Input namespace for input functions', type: 'namespace' },
    { name: 'ta', description: 'Technical analysis namespace', type: 'namespace' },
    { name: 'color', description: 'Color namespace', type: 'namespace' },
    { name: 'math', description: 'Math namespace', type: 'namespace' },
    { name: 'str', description: 'String namespace', type: 'namespace' },
    { name: 'syminfo', description: 'Symbol information namespace', type: 'namespace' },
    { name: 'timeframe', description: 'Timeframe namespace', type: 'namespace' },
    { name: 'strategy', description: 'Strategy namespace', type: 'namespace' },
    { name: 'array', description: 'Array namespace (Pine v5+)', type: 'namespace' },
    { name: 'matrix', description: 'Matrix namespace (Pine v5+)', type: 'namespace' },
    { name: 'map', description: 'Map namespace (Pine v5+)', type: 'namespace' },
    { name: 'label', description: 'Label drawing namespace', type: 'namespace' },
    { name: 'line', description: 'Line drawing namespace', type: 'namespace' },
    { name: 'box', description: 'Box drawing namespace', type: 'namespace' },
    { name: 'table', description: 'Table namespace', type: 'namespace' },
    { name: 'request', description: 'Request external data namespace', type: 'namespace' },
    { name: 'barstate', description: 'Bar state namespace', type: 'namespace' },
    { name: 'format', description: 'Format namespace for indicator formatting', type: 'namespace' },

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
    { name: 'color.fuchsia', description: 'Fuchsia color', type: 'color' },
    { name: 'color.gray', description: 'Gray color', type: 'color' },
    { name: 'color.lime', description: 'Lime color', type: 'color' },
    { name: 'color.maroon', description: 'Maroon color', type: 'color' },
    { name: 'color.navy', description: 'Navy color', type: 'color' },
    { name: 'color.olive', description: 'Olive color', type: 'color' },
    { name: 'color.silver', description: 'Silver color', type: 'color' },
    { name: 'color.teal', description: 'Teal color', type: 'color' },

    // Format constants
    { name: 'format.inherit', description: 'Inherit format from parent', type: 'const' },
    { name: 'format.price', description: 'Price format', type: 'const' },
    { name: 'format.volume', description: 'Volume format', type: 'const' },
    { name: 'format.percent', description: 'Percentage format', type: 'const' },
    { name: 'format.mintick', description: 'Min tick format', type: 'const' },

    // Plot shape constants
    { name: 'shape.xcross', description: 'X cross shape', type: 'const' },
    { name: 'shape.cross', description: 'Plus cross shape', type: 'const' },
    { name: 'shape.circle', description: 'Circle shape', type: 'const' },
    { name: 'shape.triangleup', description: 'Triangle up shape', type: 'const' },
    { name: 'shape.triangledown', description: 'Triangle down shape', type: 'const' },
    { name: 'shape.flag', description: 'Flag shape', type: 'const' },
    { name: 'shape.arrowup', description: 'Arrow up shape', type: 'const' },
    { name: 'shape.arrowdown', description: 'Arrow down shape', type: 'const' },
    { name: 'shape.labelup', description: 'Label up shape', type: 'const' },
    { name: 'shape.labeldown', description: 'Label down shape', type: 'const' },
    { name: 'shape.square', description: 'Square shape', type: 'const' },
    { name: 'shape.diamond', description: 'Diamond shape', type: 'const' },

    // Plot location constants
    { name: 'location.abovebar', description: 'Above bar location', type: 'const' },
    { name: 'location.belowbar', description: 'Below bar location', type: 'const' },
    { name: 'location.top', description: 'Top location', type: 'const' },
    { name: 'location.bottom', description: 'Bottom location', type: 'const' },
    { name: 'location.absolute', description: 'Absolute location', type: 'const' },

    // Plot size constants
    { name: 'size.auto', description: 'Auto size', type: 'const' },
    { name: 'size.tiny', description: 'Tiny size', type: 'const' },
    { name: 'size.small', description: 'Small size', type: 'const' },
    { name: 'size.normal', description: 'Normal size', type: 'const' },
    { name: 'size.large', description: 'Large size', type: 'const' },
    { name: 'size.huge', description: 'Huge size', type: 'const' },

    // Line style constants
    { name: 'line.style_solid', description: 'Solid line style', type: 'const' },
    { name: 'line.style_dotted', description: 'Dotted line style', type: 'const' },
    { name: 'line.style_dashed', description: 'Dashed line style', type: 'const' },
    { name: 'line.style_arrow_left', description: 'Arrow left style', type: 'const' },
    { name: 'line.style_arrow_right', description: 'Arrow right style', type: 'const' },
    { name: 'line.style_arrow_both', description: 'Arrow both sides style', type: 'const' },

    // Hline style constants
    { name: 'hline.style_solid', description: 'Solid hline style', type: 'const' },
    { name: 'hline.style_dotted', description: 'Dotted hline style', type: 'const' },
    { name: 'hline.style_dashed', description: 'Dashed hline style', type: 'const' },

    // Bar state variables (Pine v6 execution model)
    { name: 'barstate.isfirst', description: 'True on first bar', type: 'bool' },
    { name: 'barstate.islast', description: 'True on last bar', type: 'bool' },
    { name: 'barstate.ishistory', description: 'True on historical (closed) bars', type: 'bool' },
    { name: 'barstate.isrealtime', description: 'True on realtime bars', type: 'bool' },
    { name: 'barstate.isnew', description: 'True on first tick of new bar', type: 'bool' },
    { name: 'barstate.isconfirmed', description: 'True when bar is closed', type: 'bool' },
    { name: 'barstate.islastconfirmedhistory', description: 'True on last confirmed historical bar', type: 'bool' },

    // Strategy
    { name: 'strategy.long', description: 'Long direction', type: 'strategy.direction' },
    { name: 'strategy.short', description: 'Short direction', type: 'strategy.direction' },
    { name: 'strategy.position_size', description: 'Current position size', type: 'float' },
    { name: 'strategy.position_avg_price', description: 'Average position entry price', type: 'float' },
    { name: 'strategy.equity', description: 'Strategy equity', type: 'float' },
    { name: 'strategy.netprofit', description: 'Net profit', type: 'float' },
    { name: 'strategy.openprofit', description: 'Open profit', type: 'float' },
    { name: 'strategy.closedtrades', description: 'Number of closed trades', type: 'int' },
    { name: 'strategy.opentrades', description: 'Number of open trades', type: 'int' },
    { name: 'strategy.wintrades', description: 'Number of winning trades', type: 'int' },
    { name: 'strategy.losstrades', description: 'Number of losing trades', type: 'int' },
    { name: 'strategy.grossprofit', description: 'Gross profit', type: 'float' },
    { name: 'strategy.grossloss', description: 'Gross loss', type: 'float' },

    // Additional special variables
    { name: 'na', description: 'Not available (NaN) value', type: 'na' },
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
