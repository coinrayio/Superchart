# Extending the Server

The server is designed to be extended, not forked. The WebSocket protocol is stable; new capabilities are added by implementing new message handlers and adding rows to the database. Existing clients continue to work unchanged.

---

## Section 1: Adding a New Preset Indicator

The end-to-end flow from writing Pine Script to having it appear on the chart.

### Step 1: Write and test the Pine Script

Write the indicator in Pine Script using any of the supported features described in [Pine Script Runtime](./runtime.md). Test locally to verify that `plot()`, `hline()`, and `input()` calls behave as expected.

At minimum, your script needs:
- A version directive: `//@version=4`, `//@version=5`, or `//@version=6`
- An `indicator()` or `study()` declaration with at least a `title`
- At least one `plot()`, `hline()`, or `plotshape()` call

### Step 2: Add to the seed array in `db.ts`

Open `src/db.ts` and add an entry inside the `seedMany([...])` array:

```typescript
{
  id: 'ichimoku',
  name: 'Ichimoku Cloud',
  short_name: 'Ichi',
  description: 'Ichimoku Kinko Hyo — trend, support, and momentum composite',
  category: 'trend',
  pane_id: 'candle_pane',
  is_overlay: 1,
  is_new: 1,
  is_updated: 0,
  default_settings: JSON.stringify({ tenkan: 9, kijun: 26, senkou: 52 }),
  code: `//@version=6
indicator("Ichimoku Cloud", overlay=true)
tenkan = input.int(9, title="Tenkan Period")
kijun  = input.int(26, title="Kijun Period")
senkou = input.int(52, title="Senkou Period")
tenkanSen = _add(ta.highest(high, tenkan), ta.lowest(low, tenkan)) / 2
kijunSen  = _add(ta.highest(high, kijun), ta.lowest(low, kijun)) / 2
plot(tenkanSen, title="Tenkan-sen", color=color.blue)
plot(kijunSen,  title="Kijun-sen",  color=color.red)`,
}
```

Because the seed only runs when the table is empty, you also need to either:
- Delete `tempstore.db` and restart (all existing data is lost), or
- Insert directly using the SQLite shell or a script (see [Indicator Database](./database.md)).

### Step 3: Restart the server

```bash
npm run dev
```

The new indicator appears immediately in any `listIndicators` response.

### Step 4: Test via `executePreset`

Use a raw WebSocket client (browser console, `wscat`, or Postman) to verify:

```json
{
  "type": "executePreset",
  "requestId": "test_1",
  "indicatorName": "Ichimoku Cloud",
  "symbol": { "ticker": "BINA_USDT_BTC" },
  "period": { "type": "hour", "span": 1, "text": "1H" }
}
```

You should receive `subscribeAck` followed by `indicatorData`.

### Step 5: Set `is_new = 1` to show the badge

The `is_new` flag is already set to `1` in the example above. The client UI will show a "New" badge next to the indicator name in the browser modal. Clear it after your users have had a chance to see it:

```sql
UPDATE indicators SET is_new = 0 WHERE name = 'Ichimoku Cloud';
```

---

## Section 2: Adding a New WebSocket Message Type

### Step 1: Define the types in `src/types.ts`

```typescript
// Request
export interface PingRequest extends WSMessage {
  type: 'ping'
  payload?: string
}

// Response
export interface PongResponse extends WSMessage {
  type: 'pong'
  payload?: string
  serverTime: number
}
```

### Step 2: Import the new types in `src/index.ts`

```typescript
import type {
  // ... existing imports ...
  PingRequest,
} from './types.js'
```

### Step 3: Add a case to the switch statement in `src/index.ts`

```typescript
case 'ping':
  await handlePing(ws, message as PingRequest)
  break
```

### Step 4: Implement the handler function

```typescript
async function handlePing(ws: WebSocket, message: PingRequest) {
  ws.send(JSON.stringify({
    type: 'pong',
    requestId: message.requestId,
    payload: message.payload,
    serverTime: Date.now(),
  }))
}
```

### Step 5: Test with a raw WebSocket client

```javascript
// Browser console
const ws = new WebSocket('ws://localhost:8080')
ws.onopen = () => ws.send(JSON.stringify({ type: 'ping', requestId: 'p1', payload: 'hello' }))
ws.onmessage = (e) => console.log(JSON.parse(e.data))
// Expected: { type: 'pong', requestId: 'p1', payload: 'hello', serverTime: 1700000000000 }
```

### Handler function template

```typescript
async function handleMyMessage(ws: WebSocket, message: MyRequest) {
  try {
    // 1. Validate inputs
    if (!message.someRequiredField) {
      sendError(ws, 'someRequiredField is required', message.requestId)
      return
    }

    // 2. Do work
    const result = await doSomething(message.someRequiredField)

    // 3. Send response
    ws.send(JSON.stringify({
      type: 'myResponse',
      requestId: message.requestId,
      data: result,
    }))
  } catch (error) {
    sendError(ws, (error as Error).message, message.requestId)
  }
}
```

---

## Section 3: Adding a New Data Source (Replacing Coinray)

`CoinrayClient` in `src/coinrayClient.ts` is the only place market data is fetched. To replace it with a different exchange or data provider, implement the same interface and swap the import in `src/index.ts`.

### The `MarketDataClient` interface

```typescript
interface MarketDataClient {
  /**
   * Fetch historical OHLCV candles.
   * @param symbol  Target market symbol
   * @param period  Candle interval
   * @param limit   Maximum number of candles to return (default 500)
   * @param before  If provided, fetch candles ending before this Unix ms timestamp
   */
  fetchHistory(
    symbol: SymbolInfo,
    period: Period,
    limit?: number,
    before?: number
  ): Promise<Candle[]>

  /**
   * Subscribe to real-time candle updates.
   * @param symbol   Target market symbol
   * @param period   Candle interval
   * @param onTick   Callback fired on each new or updated candle
   * @returns        A subscription key string to pass to unsubscribe()
   */
  subscribeKlines(
    symbol: SymbolInfo,
    period: Period,
    onTick: (candle: Candle) => void
  ): Promise<string>

  /**
   * Cancel a real-time subscription.
   * @param subscriptionKey  The key returned by subscribeKlines()
   */
  unsubscribe(subscriptionKey: string): Promise<void>

  /**
   * Clean up all open subscriptions (called on server shutdown).
   */
  dispose(): Promise<void>
}
```

The `Candle` type:

```typescript
interface Candle {
  timestamp: number  // Unix milliseconds
  open: number
  high: number
  low: number
  close: number
  volume: number
}
```

### Swapping the data source

1. Create `src/myDataClient.ts` implementing the interface above.
2. In `src/index.ts`, replace:
   ```typescript
   import { CoinrayClient } from './coinrayClient.js'
   // ...
   const coinrayClient = new CoinrayClient()
   ```
   with:
   ```typescript
   import { MyDataClient } from './myDataClient.js'
   // ...
   const coinrayClient = new MyDataClient(process.env.MY_API_KEY)
   ```

No other code changes are needed. The `handleExecute`, `handleLoadHistory`, and the real-time subscription logic all call through `coinrayClient` uniformly.

---

## Section 4: Adding New Pine Script Functions to the Executor

See the detailed walkthrough in [Pine Script Runtime — Extending the Executor](./runtime.md#extending-the-executor-with-new-functions).

**Quick summary:**

1. Implement the calculation in `src/runtime/indicators.ts`.
2. Expose in the `ta` namespace (and optionally the legacy bare namespace) in `createContext()` inside `src/runtime/executor.ts`.
3. Restart — no protocol or database changes needed.

### Using TA-Lib for complex indicators

TA-Lib functions require specific input parameter names. Use the `indicators.execute()` wrapper:

```typescript
// In createContext():
ta: {
  // ...
  adx: (length: number) => {
    return this.indicators.execute('ADX', {
      startIdx: 0,
      endIdx: (context.close as number[]).length - 1,
      high: context.high,
      low: context.low,
      close: context.close,
      optInTimePeriod: length,
    }).result?.outReal || []
  },
}
```

The `safeExecute` wrapper in `indicators.ts` automatically sanitizes `NaN` values in input arrays (TA-Lib native code can segfault on them) and returns a NaN-filled array if the calculation fails.

---

## Section 5: Production Hardening

### Running behind a reverse proxy (nginx)

The server speaks plain WebSocket. Nginx can terminate TLS and proxy the upgrade:

```nginx
location /ws {
  proxy_pass         http://localhost:8080;
  proxy_http_version 1.1;
  proxy_set_header   Upgrade $http_upgrade;
  proxy_set_header   Connection "upgrade";
  proxy_set_header   Host $host;
  proxy_read_timeout 3600s;
}
```

Clients then connect to `wss://your-domain.com/ws`.

### WebSocket compression

Enable `permessage-deflate` in the `ws` server options in `src/index.ts`:

```typescript
const wss = new WebSocketServer({
  port: PORT,
  host: HOST,
  perMessageDeflate: {
    zlibDeflateOptions: { chunkSize: 1024, memLevel: 7, level: 3 },
    zlibInflateOptions: { chunkSize: 10 * 1024 },
    threshold: 1024,   // Only compress messages larger than 1KB
  },
})
```

`indicatorData` messages can be large (up to 500 data points). Compression typically reduces them by 60–80%.

### Connection and script limits

The `.env.example` documents `MAX_CONCURRENT_SCRIPTS` and `MAX_SCRIPT_EXECUTION_TIME`. To enforce them, add guard logic at the top of `handleExecute`:

```typescript
const MAX_SCRIPTS = parseInt(process.env.MAX_CONCURRENT_SCRIPTS || '100')

async function handleExecute(ws: WebSocket, message: ExecuteRequest) {
  if (activeScripts.size >= MAX_SCRIPTS) {
    sendError(ws, 'Server at capacity. Try again later.', message.requestId)
    return
  }
  // ... rest of handler
}
```

### Logging to file

Pipe stdout to a log file using a process manager, or use a structured logger:

```bash
npm run start 2>&1 | tee -a /var/log/superchart-server.log
```

### PM2 process manager

```bash
npm install -g pm2
pm2 start dist/index.js --name superchart-server --restart-delay=3000
pm2 save
pm2 startup  # Install PM2 startup script
```

Monitor:
```bash
pm2 logs superchart-server
pm2 monit
```

### Graceful shutdown

The server already handles `SIGINT` gracefully (stops all active scripts, unsubscribes from Coinray, closes the WebSocket server). PM2 sends `SIGINT` by default on `pm2 stop`. For Kubernetes or systemd, add a `SIGTERM` handler mirroring the `SIGINT` handler.
