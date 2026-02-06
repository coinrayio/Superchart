# Superchart Script Execution Server

WebSocket server that executes user-provided Pine Script code for real-time indicator calculations.

## Features

- 🚀 **Real-time Script Execution**: Executes Pine Script on live market data
- 📊 **Historical Data**: Fetches up to 500 candles of historical OHLCV data
- 🔄 **Live Updates**: Subscribes to real-time market data via Coinray WebSocket
- 🧮 **Built-in Indicators**: Supports common technical indicators (SMA, EMA, RSI, MACD, Bollinger Bands, etc.)
- 🔌 **WebSocket API**: Simple request/response protocol

## Architecture

The server implements a **Pine Script runtime** that:

1. **Parses** user-provided Pine Script code
2. **Compiles** it into executable JavaScript
3. **Fetches** historical market data from Coinray
4. **Executes** the script on the data
5. **Streams** results back to clients via WebSocket

```
Client Script → Parse → Compile → Fetch Data → Execute → Stream Results
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Add your Coinray API token to `.env`:
```
COINRAY_TOKEN=your_token_here
```

Get your token from [https://coinray.com](https://coinray.com)

## Running

### Development (with auto-reload):
```bash
npm run dev
```

### Production:
```bash
npm run build
npm start
```

Server runs on `ws://localhost:8080` by default.

## WebSocket Protocol

### Message Types

#### 1. Compile Request
Validate and compile a script without executing it.

```json
{
  "type": "compile",
  "requestId": "unique-request-id",
  "code": "indicator('My RSI')\\nrsiValue = rsi(close, 14)\\nplot(rsiValue)",
  "language": "pine"
}
```

**Response:**
```json
{
  "type": "compileResult",
  "requestId": "unique-request-id",
  "result": {
    "success": true,
    "metadata": {
      "shortName": "My RSI",
      "precision": 2,
      "paneId": "my_rsi",
      "plots": [
        {
          "type": "plot",
          "id": "rsiValue",
          "title": "rsiValue",
          "color": "#2196F3"
        }
      ],
      "settings": [
        {
          "key": "length",
          "type": "number",
          "label": "Length",
          "defaultValue": 14,
          "min": 1,
          "max": 500
        }
      ]
    },
    "errors": [],
    "warnings": []
  }
}
```

#### 2. Execute Request
Execute a script and start streaming indicator data.

```json
{
  "type": "execute",
  "requestId": "unique-request-id",
  "code": "indicator('My RSI')\\nlength = input(14)\\nrsiValue = rsi(close, length)\\nplot(rsiValue)",
  "language": "pine",
  "symbol": {
    "ticker": "BINA_USDT_BTC",
    "pricePrecision": 2
  },
  "period": {
    "multiplier": 1,
    "timespan": "hour",
    "text": "1H"
  },
  "settings": {
    "length": 14
  }
}
```

**Response 1 - Subscription Acknowledgment:**
```json
{
  "type": "subscribeAck",
  "requestId": "unique-request-id",
  "scriptId": "550e8400-e29b-41d4-a716-446655440000",
  "metadata": { /* ... */ }
}
```

**Response 2 - Initial Data:**
```json
{
  "type": "indicatorData",
  "scriptId": "550e8400-e29b-41d4-a716-446655440000",
  "data": [
    {
      "timestamp": 1704067200000,
      "values": {
        "rsiValue": 65.23
      }
    },
    // ... more data points
  ]
}
```

**Response 3+ - Real-time Ticks:**
```json
{
  "type": "indicatorTick",
  "scriptId": "550e8400-e29b-41d4-a716-446655440000",
  "data": {
    "timestamp": 1704070800000,
    "values": {
      "rsiValue": 67.45
    }
  }
}
```

#### 3. Stop Request
Stop a running script execution.

```json
{
  "type": "stop",
  "requestId": "unique-request-id",
  "scriptId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```json
{
  "type": "stopAck",
  "requestId": "unique-request-id",
  "scriptId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Error Response
```json
{
  "type": "error",
  "requestId": "unique-request-id",
  "scriptId": "550e8400-e29b-41d4-a716-446655440000",
  "error": "Error message"
}
```

## Supported Pine Script Features

### Built-in Functions

**Moving Averages:**
- `sma(source, length)` - Simple Moving Average
- `ema(source, length)` - Exponential Moving Average
- `wma(source, length)` - Weighted Moving Average
- `rma(source, length)` - Running Moving Average

**Oscillators:**
- `rsi(source, length)` - Relative Strength Index
- `macd(source, fast, slow, signal)` - MACD
- `stoch(close, high, low, length)` - Stochastic Oscillator
- `atr(high, low, close, length)` - Average True Range

**Bands & Channels:**
- `bb(source, length, mult)` - Bollinger Bands

**Aggregation:**
- `sum(source, length)` - Sum over N bars
- `highest(source, length)` - Highest value over N bars
- `lowest(source, length)` - Lowest value over N bars
- `stdev(source, length)` - Standard Deviation

**Crossover Detection:**
- `crossover(a, b)` - Bullish crossover
- `crossunder(a, b)` - Bearish crossunder

**Math Functions:**
- `abs()`, `max()`, `min()`, `pow()`, `sqrt()`, `log()`, `exp()`, `round()`, `floor()`, `ceil()`

### Built-in Variables

**Price Data:**
- `open`, `high`, `low`, `close`, `volume`
- `hl2` - (high + low) / 2
- `hlc3` - (high + low + close) / 3
- `ohlc4` - (open + high + low + close) / 4

**Time:**
- `time` - Bar timestamp

### Plotting

```pine
// Plot a line
plot(series, title="Title", color=color.blue, linewidth=2)

// Horizontal line
hline(50, title="Midline", color=color.gray, linestyle=dashed)
```

## Example Scripts

### Simple RSI
```pine
//@version=5
indicator("My RSI", overlay=false)

length = input(14, title="RSI Length")
rsiValue = rsi(close, length)

plot(rsiValue, title="RSI", color=color.purple)
hline(70, title="Overbought", color=color.red, linestyle=dashed)
hline(50, title="Midline", color=color.gray, linestyle=dotted)
hline(30, title="Oversold", color=color.green, linestyle=dashed)
```

### MACD
```pine
//@version=5
indicator("My MACD", overlay=false)

fastLength = input(12, title="Fast Length")
slowLength = input(26, title="Slow Length")
signalLength = input(9, title="Signal Length")

result = macd(close, fastLength, slowLength, signalLength)
macdLine = result.macd
signalLine = result.signal
histogram = result.histogram

plot(macdLine, title="MACD", color=color.blue)
plot(signalLine, title="Signal", color=color.orange)
plot(histogram, title="Histogram", color=color.gray)
hline(0, title="Zero", color=color.gray)
```

### Bollinger Bands
```pine
//@version=5
indicator("My BB", overlay=true)

length = input(20, title="Length")
mult = input(2.0, title="StdDev")

result = bb(close, length, mult)
upper = result.upper
middle = result.middle
lower = result.lower

plot(upper, title="Upper Band", color=color.red)
plot(middle, title="Middle Band", color=color.blue)
plot(lower, title="Lower Band", color=color.green)
```

## Development

### Project Structure
```
server/
├── src/
│   ├── index.ts              # WebSocket server
│   ├── types.ts              # Type definitions
│   ├── coinrayClient.ts      # Coinray API client
│   └── runtime/
│       ├── parser.ts         # Pine Script parser
│       ├── executor.ts       # Script executor
│       └── indicators.ts     # Technical indicators library
├── package.json
├── tsconfig.json
└── .env.example
```

### Adding New Indicators

1. Add the indicator function to `src/runtime/indicators.ts`
2. Export it from the `Indicators` class
3. Add it to the context in `src/runtime/executor.ts`

Example:
```typescript
// In indicators.ts
cci(source: number[], length: number): number[] {
  // Implementation
}

// In executor.ts
const context = {
  // ...
  cci: (source: number[], length: number) => this.indicators.cci(source, length),
}
```

## License

Apache 2.0
