# WebSocket Protocol Reference

This document describes every message type exchanged between the Superchart client and the Script Execution Server.

---

## Connection

Connect to:
```
ws://HOST:PORT
```
Default: `ws://localhost:8080`

There is no HTTP upgrade step beyond the standard WebSocket handshake. No authentication headers are required from the client; the server authenticates to Coinray using its own `COINRAY_TOKEN` environment variable.

---

## Message Format

All messages are UTF-8 encoded JSON objects sent as WebSocket text frames.

Every message has a `type` field that identifies its purpose.

**Requests** (client → server) include a `requestId` string. This is an arbitrary client-generated token used to match the server's response back to the originating call. It must be unique per in-flight request on a single connection.

**Responses** (server → client) echo the same `requestId` when replying to a specific request.

**Streaming messages** (`indicatorData`, `indicatorTick`, `indicatorHistory`) are keyed by `scriptId` and are not tied to any `requestId`.

---

## Message Types

### 1. `compile`

Validates and parses a Pine Script without executing it. Returns any syntax errors and the extracted indicator metadata.

**Request:**
```json
{
  "type": "compile",
  "requestId": "compile_1",
  "code": "//@version=6\nindicator(\"My RSI\", overlay=false)\n...",
  "language": "pine"
}
```

| Field | Type | Description |
|---|---|---|
| `type` | `"compile"` | Message discriminator. |
| `requestId` | `string` | Client-assigned correlation ID. |
| `code` | `string` | Full Pine Script source code. |
| `language` | `"pine"` | Always `"pine"` in current implementation. |

**Response:**
```json
{
  "type": "compileResult",
  "requestId": "compile_1",
  "result": {
    "success": true,
    "errors": [],
    "warnings": [],
    "metadata": {
      "shortName": "My RSI",
      "precision": 2,
      "paneId": "my_rsi",
      "plots": [...],
      "settings": [...]
    }
  }
}
```

| Field | Type | Description |
|---|---|---|
| `result.success` | `boolean` | `true` if parsing succeeded with no errors. |
| `result.errors` | `ScriptDiagnostic[]` | Array of error diagnostics (empty on success). |
| `result.warnings` | `ScriptDiagnostic[]` | Array of warning diagnostics. |
| `result.metadata` | `IndicatorMetadata \| null` | Extracted indicator metadata, or `null` on failure. |

---

### 2. `execute`

Parses and executes a Pine Script on live market data. The server fetches historical candles, runs the script, streams results, and keeps a real-time subscription open until `stop` is called or the client disconnects.

**Request:**
```json
{
  "type": "execute",
  "requestId": "execute_1",
  "code": "//@version=6\nindicator(\"My RSI\", overlay=false)\n...",
  "language": "pine",
  "symbol": {
    "ticker": "BINA_USDT_BTC",
    "pricePrecision": 2,
    "volumePrecision": 0
  },
  "period": {
    "type": "hour",
    "span": 1,
    "text": "1H"
  },
  "settings": {
    "length": 14
  }
}
```

| Field | Type | Description |
|---|---|---|
| `type` | `"execute"` | Message discriminator. |
| `requestId` | `string` | Client-assigned correlation ID. |
| `code` | `string` | Pine Script source. |
| `language` | `"pine"` | Always `"pine"`. |
| `symbol` | `SymbolInfo` | Market symbol to fetch candles for. |
| `period` | `Period` | Candle interval. |
| `settings` | `Record<string, SettingValue>` | Optional input overrides. Keys match `input()` variable names in the script. |

**Response 1 — Subscription acknowledgment:**
```json
{
  "type": "subscribeAck",
  "requestId": "execute_1",
  "scriptId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "metadata": { ... }
}
```

| Field | Type | Description |
|---|---|---|
| `scriptId` | `string` | UUID assigned to this execution. Use it for `stop`, `loadHistory`, and to match streaming messages. |
| `metadata` | `IndicatorMetadata` | Parsed indicator metadata (plot config, settings, pane info). |

**Response 2 — Historical data:**
```json
{
  "type": "indicatorData",
  "scriptId": "f47ac10b-...",
  "data": [
    { "timestamp": 1700000000000, "values": { "rsiValue": 52.3 } },
    { "timestamp": 1700003600000, "values": { "rsiValue": 48.7 } }
  ]
}
```

Sent immediately after `subscribeAck`. Contains all computed data points for the initially loaded candle window (up to 500 candles).

**Streaming — Real-time tick:**
```json
{
  "type": "indicatorTick",
  "scriptId": "f47ac10b-...",
  "data": { "timestamp": 1700007200000, "values": { "rsiValue": 55.1 } }
}
```

Sent each time the Coinray real-time feed delivers a candle update. The server re-runs the full script on the updated candle buffer and sends the last computed data point.

---

### 3. `stop`

Stops execution and cancels the Coinray real-time subscription for a given `scriptId`.

**Request:**
```json
{
  "type": "stop",
  "requestId": "stop_1",
  "scriptId": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
}
```

**Response:**
```json
{
  "type": "stopAck",
  "requestId": "stop_1",
  "scriptId": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
}
```

After `stopAck` the server will no longer send `indicatorTick` for this `scriptId`. The client should also remove any local subscription state.

---

### 4. `loadHistory`

Fetches older candles and recomputes the full indicator series with the extended history. Used for infinite scroll (the user panning left past the oldest loaded bar).

**Request:**
```json
{
  "type": "loadHistory",
  "scriptId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "before": 1699996400000
}
```

| Field | Type | Description |
|---|---|---|
| `scriptId` | `string` | The active execution to extend. |
| `before` | `number` | Unix millisecond timestamp. The server fetches up to 500 candles whose timestamps are strictly earlier than this value. |

**Response:**
```json
{
  "type": "indicatorHistory",
  "scriptId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "data": [
    { "timestamp": 1699900000000, "values": { "rsiValue": 61.2 } },
    ...
  ]
}
```

The response contains **all** recalculated data points (not just the newly prepended ones). This is intentional: extending the candle window corrects warmup-period values at the boundary of the previous load. The client's `onHistory` handler should merge/overwrite existing data points by timestamp.

If no new candles are available before `before`, the server responds with `data: []`.

---

### 5. `listIndicators`

Returns all preset indicators stored in the server's SQLite database. The Pine Script source code is **not** included in the response.

**Request:**
```json
{
  "type": "listIndicators",
  "requestId": "list_1"
}
```

**Response:**
```json
{
  "type": "indicatorList",
  "requestId": "list_1",
  "indicators": [
    {
      "name": "Stochastic",
      "shortName": "Stoch",
      "description": "Stochastic oscillator with %K and %D lines",
      "category": "oscillator",
      "paneId": "sub",
      "isOverlay": false,
      "isNew": true,
      "isUpdated": false,
      "defaultSettings": { "periodK": 14, "smoothK": 1, "periodD": 3 }
    }
  ]
}
```

---

### 6. `executePreset`

Looks up a preset indicator by name in the database and executes it exactly like `execute`. The source code is fetched internally; the client never sees it. The response sequence is identical to `execute` (`subscribeAck` → `indicatorData` → `indicatorTick` stream).

**Request:**
```json
{
  "type": "executePreset",
  "requestId": "preset_1",
  "indicatorName": "Stochastic",
  "symbol": {
    "ticker": "BINA_USDT_BTC"
  },
  "period": {
    "type": "hour",
    "span": 1,
    "text": "1H"
  },
  "settings": {
    "periodK": 14,
    "smoothK": 1,
    "periodD": 3
  }
}
```

| Field | Type | Description |
|---|---|---|
| `indicatorName` | `string` | Must exactly match the `name` column in the `indicators` table. |
| `symbol` | `SymbolInfo` | Target symbol. |
| `period` | `Period` | Candle interval. |
| `settings` | `Record<string, SettingValue>` | Optional setting overrides. |

**Responses:** Same as `execute` — `subscribeAck`, `indicatorData`, `indicatorTick`.

If the `indicatorName` is not found in the database, the server replies with an `error` message.

---

### 7. `getIndicatorCode`

Returns the raw Pine Script source code for a preset indicator. Used to display the source in a read-only editor (so users can inspect but not modify server presets).

**Request:**
```json
{
  "type": "getIndicatorCode",
  "requestId": "code_1",
  "indicatorName": "Stochastic"
}
```

**Response:**
```json
{
  "type": "indicatorCode",
  "requestId": "code_1",
  "indicatorName": "Stochastic",
  "code": "//@version=6\nindicator(title=\"Stochastic\"...)"
}
```

---

### Error Response

Any request that encounters a server-side error receives:

```json
{
  "type": "error",
  "requestId": "execute_1",
  "scriptId": "f47ac10b-...",
  "error": "Script compilation failed"
}
```

| Field | Type | Description |
|---|---|---|
| `requestId` | `string \| undefined` | Present if the error is tied to a specific request. |
| `scriptId` | `string \| undefined` | Present if the error is tied to a specific running script. |
| `error` | `string` | Human-readable error message. |

---

## Type Definitions

### `SymbolInfo`

```typescript
interface SymbolInfo {
  ticker: string           // Coinray symbol format: EXCHANGE_QUOTE_BASE (e.g., "BINA_USDT_BTC")
  exchange?: string
  pricePrecision?: number  // Decimal places for price display
  volumePrecision?: number // Decimal places for volume display
  minPrice?: number
  maxPrice?: number
  minQuantity?: number
  maxQuantity?: number
}
```

### `Period`

```typescript
interface Period {
  // klinecharts format (preferred)
  type?: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month'
  span?: number

  // Legacy format (also accepted)
  multiplier?: number
  timespan?: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month'

  text: string  // Human-readable label, e.g. "1H", "4H", "1D"
}
```

Both formats are accepted. Examples:
- `{ type: 'hour', span: 1, text: '1H' }` — 1-hour candles (klinecharts format)
- `{ timespan: 'minute', multiplier: 15, text: '15m' }` — 15-minute candles (legacy format)

### `SettingValue`

```typescript
type SettingValue = string | number | boolean
```

### `IndicatorDataPoint`

One data point per candle, carrying the computed series values and optional per-bar colors.

```typescript
interface IndicatorDataPoint {
  timestamp: number                      // Unix milliseconds
  values: Record<string, number>         // plotId → numeric value (NaN values are omitted)
  colors?: Record<string, string>        // plotId → CSS color string (for dynamic/ternary colors)
  ohlc?: Record<string, {               // For plotcandle outputs
    open: number
    high: number
    low: number
    close: number
  }>
}
```

Plot IDs in `values` correspond to:
- The series variable name for `plot()` calls (e.g., `rsiValue` if the script has `plot(rsiValue, ...)`)
- Sequential keys `plotshape_0`, `plotshape_1`, ... for `plotshape()` calls
- The variable name or `hline_<price>` for `hline()` calls

### `IndicatorMetadata`

Describes the indicator's display configuration. Sent in `subscribeAck`.

```typescript
interface IndicatorMetadata {
  shortName: string           // Display name (from shorttitle= or truncated title)
  precision: number           // Decimal places for value display
  paneId: string              // 'candle_pane' for overlays; unique string for sub-panes
  plots: IndicatorPlot[]      // Array of plot/hline/fill/shape definitions
  settings?: IndicatorSetting[] // User-configurable inputs
  minValue?: number           // Optional y-axis minimum
  maxValue?: number           // Optional y-axis maximum
}
```

### `ScriptDiagnostic`

A compile-time error or warning with source location.

```typescript
interface ScriptDiagnostic {
  line: number
  column: number
  endLine?: number
  endColumn?: number
  message: string
  severity: 'error' | 'warning' | 'info'
}
```

### `IndicatorPlot` (union type)

```typescript
type IndicatorPlot =
  | PlotLine        // type: 'plot'
  | PlotHistogram   // type: 'histogram'
  | PlotHLine       // type: 'hline'
  | PlotShape       // type: 'plotshape'
  | PlotChar        // type: 'plotchar'
  | PlotArrow       // type: 'plotarrow'
  | PlotCandle      // type: 'plotcandle'
  | PlotFill        // type: 'fill'
  | PlotBgColor     // type: 'bgcolor'
```

Key fields by type:

| Plot type | Key fields |
|---|---|
| `plot` | `id`, `title`, `color`, `linewidth`, `style`, `gapConnect` |
| `hline` | `id`, `price`, `title`, `color`, `linestyle` |
| `plotshape` | `id`, `series`, `title`, `style`, `location`, `color`, `size`, `text`, `textcolor` |
| `fill` | `id`, `plot1`, `plot2`, `color`, `transp` |

---

## TypeScript Client Example

A minimal TypeScript client that connects, executes a script, and logs every tick:

```typescript
const ws = new WebSocket('ws://localhost:8080')
let requestCounter = 0

ws.addEventListener('open', () => {
  // Execute a simple RSI script
  const requestId = `execute_${++requestCounter}`

  ws.send(JSON.stringify({
    type: 'execute',
    requestId,
    code: `//@version=6
indicator("RSI", overlay=false)
length = input.int(14, title="Length")
rsiValue = ta.rsi(close, length)
plot(rsiValue, title="RSI", color=color.purple)
hline(70, color=color.red, linestyle=hline.style_dashed)
hline(30, color=color.green, linestyle=hline.style_dashed)`,
    language: 'pine',
    symbol: { ticker: 'BINA_USDT_BTC', pricePrecision: 2 },
    period: { type: 'hour', span: 1, text: '1H' },
    settings: { length: 14 },
  }))
})

ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data)

  switch (msg.type) {
    case 'subscribeAck':
      console.log('Subscribed:', msg.scriptId)
      console.log('Plots:', msg.metadata.plots.map((p: any) => p.id || p.type))
      break

    case 'indicatorData':
      console.log(`Received ${msg.data.length} historical data points`)
      // Each point: { timestamp, values: { rsiValue: 52.3 } }
      break

    case 'indicatorTick':
      // Fires on every new or updated candle
      console.log('Tick:', msg.data.timestamp, msg.data.values)
      break

    case 'error':
      console.error('Server error:', msg.error)
      break
  }
})

ws.addEventListener('close', () => {
  console.log('Disconnected')
})
```
