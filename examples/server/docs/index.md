# Superchart Script Execution Server

The Script Execution Server is a Node.js/TypeScript WebSocket server built on the `ws` library. It accepts Pine Script source code from connected clients, compiles and executes that code against live OHLCV market data fetched from the Coinray API, and streams computed indicator data points back to the client in real time.

Clients never execute Pine Script themselves. They send a code string plus a symbol and period to the server; the server runs the computation and pushes results over the same WebSocket connection.

---

## Why Server-Side Execution?

| Concern | How the server helps |
|---|---|
| **Code privacy** | Pine Script source never leaves the server. Clients that call `executePreset` never receive the indicator source. |
| **Heavy computation** | TA-Lib FFI calls and array operations run on Node.js, not in the browser's JS thread. |
| **Centralized indicator library** | The SQLite database is the single source of truth for all preset indicators; clients query it via `listIndicators`. |
| **Preset management** | Indicator metadata (category, pane, default settings, badges) lives in the DB and is served to all clients without distributing source code. |

---

## Architecture Overview

```
Client (Browser)
     │  WebSocket (ws://)
     ▼
[WebSocket Router] ──── src/index.ts
     ├── compile        →  PineScriptParser      (src/runtime/parser.ts)
     ├── execute        →  PineScriptExecutor ──→ CoinrayClient (src/coinrayClient.ts)
     ├── stop
     ├── loadHistory    →  PineScriptExecutor ──→ CoinrayClient
     ├── listIndicators →  SQLite DB             (src/db.ts)
     ├── executePreset  →  SQLite DB → PineScriptExecutor
     └── getIndicatorCode → SQLite DB
```

**Data flow for `execute`:**

1. Client sends `{ type: 'execute', code, symbol, period }`.
2. `PineScriptParser` extracts metadata (title, inputs, plots) from the source.
3. `CoinrayClient.fetchHistory` fetches up to 500 OHLCV candles from Coinray.
4. `PineScriptExecutor.execute` runs the script element-wise over the candle arrays.
5. Server replies with `subscribeAck` (metadata), then `indicatorData` (all historical points).
6. `CoinrayClient.subscribeKlines` opens a real-time candle stream. Each tick re-executes the script and pushes an `indicatorTick` message to the client.

---

## Tech Stack

| Package | Role |
|---|---|
| `ws` ^8 | WebSocket server |
| `better-sqlite3` ^11 | Synchronous SQLite access for the indicator database |
| `coinrayjs` ^2 | Coinray API client: historical OHLCV fetch + real-time candle subscription |
| `talib` ^2 | TA-Lib native bindings for 100+ technical analysis functions |
| `uuid` ^9 | UUIDs for `scriptId` assignment |
| `dotenv` ^16 | `.env` file loading |
| `tsx` ^4 | TypeScript execution for development (`tsx watch`) |
| `typescript` ^5 | Static typing |

---

## Setup

### Prerequisites

- Node.js 20 or higher
- npm or pnpm
- A Coinray API token (obtain from [coinray.com](https://coinray.com))

### Steps

1. Navigate to the server directory:
   ```bash
   cd examples/server/
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   pnpm install
   ```

3. Copy the example environment file and fill in your token:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env`:
   ```env
   COINRAY_TOKEN=your_coinray_token_here
   PORT=8080
   HOST=localhost
   ```

4. Start the development server with live reload:
   ```bash
   npm run dev
   ```
   You should see:
   ```
   Script Execution Server running on ws://localhost:8080
   Database seeded with 6 preset indicators  (first run only)
   ```

---

## Environment Variables

| Variable | Default | Required | Description |
|---|---|---|---|
| `COINRAY_TOKEN` | — | **Yes** | Coinray API authentication token. The server exits immediately if this is missing. |
| `PORT` | `8080` | No | TCP port the WebSocket server binds to. |
| `HOST` | `localhost` | No | Hostname / IP address to bind. Use `0.0.0.0` to accept connections from any interface. |
| `MAX_SCRIPT_EXECUTION_TIME` | `30000` | No | Documented in `.env.example` for reference; not yet enforced at runtime. |
| `MAX_CONCURRENT_SCRIPTS` | `100` | No | Documented in `.env.example` for reference; not yet enforced at runtime. |

---

## npm Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `tsx watch src/index.ts` | Start server with hot-reload on file changes. |
| `build` | `tsc` | Compile TypeScript to `dist/`. |
| `start` | `node dist/index.js` | Run the compiled production build. |

---

## WebSocket Endpoint

The server listens on `ws://HOST:PORT` (default `ws://localhost:8080`). There is no HTTP fallback or REST API. All communication is JSON over WebSocket.

Authentication is handled server-side via `COINRAY_TOKEN`. Connected clients have no credentials — restrict network access if running on a public interface.

---

## Related Documentation

- [WebSocket Protocol Reference](./protocol.md) — Full message schema for all 7 message types, type definitions, and a TypeScript client example.
- [Indicator Database](./database.md) — SQLite schema, seeded presets, and CRUD operations for managing indicator presets.
- [Pine Script Runtime](./runtime.md) — Parser, executor, supported functions, built-in variables, and known limitations.
- [Extending the Server](./extending.md) — Adding indicators, new message types, custom data sources, and production deployment.
