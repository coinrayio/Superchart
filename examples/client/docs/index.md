# Superchart Example Client

The example client is a React + Vite application that demonstrates a fully integrated Superchart setup. It connects to two external services:

- **Coinray API** — for real-time OHLCV market data and historical candle fetching.
- **Script Execution Server** (see `examples/server/`) — for compiling and executing Pine Script indicators server-side.

The client is a reference implementation that can be forked and adapted. Each of its three provider layers is independently replaceable.

---

## Features Demonstrated

- Live OHLC candlestick charts with real-time updates
- Server-preset indicators displayed in a TradingView-style indicator browser modal (grouped by category, with New/Updated badges)
- Custom Pine Script compilation and execution via a built-in code editor
- Historical candle backfill with warmup-period correction when the user scrolls left
- Drawing tools toolbar

---

## Architecture Overview

```
Browser (React)
├── src/App.tsx
│   ├── CoinrayDatafeed ──────────────────────→ Coinray API (market data)
│   │   └── createDataLoader(datafeed)
│   │       └── setOnBarsLoaded(cb)            (triggers history backfill)
│   ├── WebSocketScriptProvider ──────────────→ Script Server :8080
│   └── WebSocketIndicatorProvider ───────────→ Script Server :8080
│
└── new Superchart({
      container, symbol, period, dataLoader,
      scriptProvider, indicatorProvider,
      locale, theme, timezone, showVolume, drawingBarVisible
    })
```

**Initialization sequence in `App.tsx`:**

1. `CoinrayDatafeed` is created with the Coinray token.
2. `createDataLoader(datafeed)` wraps the datafeed in the Superchart data loader interface.
3. `WebSocketScriptProvider` and `WebSocketIndicatorProvider` open WebSocket connections to the script server.
4. `dataLoader.setOnBarsLoaded(cb)` registers a callback that fires when the user scrolls the chart left past the oldest loaded bar. The callback calls `loadHistoryBefore(fromMs)` on both providers so that indicator data is extended to match the new candles.
5. `new Superchart(...)` mounts the chart into the DOM and starts the data loading cycle.

---

## Prerequisites

- Node.js 18 or higher
- The Script Execution Server running at `localhost:8080` (see `examples/server/docs/index.md`)
- A Coinray API token

---

## Setup

1. Navigate to the client directory:
   ```bash
   cd examples/client/
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` and fill in your values:
   ```env
   VITE_COINRAY_TOKEN=your_coinray_token_here
   VITE_SCRIPT_SERVER_URL=ws://localhost:8080
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Environment Variables

| Variable | Default | Required | Description |
|---|---|---|---|
| `VITE_COINRAY_TOKEN` | — | **Yes** | Coinray API authentication token. If missing, the app renders a configuration error overlay. |
| `VITE_SCRIPT_SERVER_URL` | `ws://localhost:8080` | No | WebSocket URL of the Script Execution Server. |

Vite only exposes variables prefixed with `VITE_` to the browser bundle. Do not add secrets beyond the Coinray token.

---

## npm Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `vite` | Start the Vite dev server with HMR at `http://localhost:5173`. |
| `build` | `tsc && vite build` | Type-check then compile to `dist/`. |
| `preview` | `vite preview` | Serve the production build locally for inspection. |

---

## File Structure

```
examples/client/
├── src/
│   ├── App.tsx                            Main entry — creates all providers and mounts Superchart
│   ├── vite-env.d.ts                      Vite environment variable type declarations
│   ├── datafeed/
│   │   └── CoinrayDatafeed.ts             Implements the Datafeed interface using Coinray
│   ├── indicator/
│   │   └── WebSocketIndicatorProvider.ts  IndicatorProvider for server-preset indicators
│   ├── script/
│   │   └── WebSocketScriptProvider.ts     ScriptProvider for user-written Pine Script
│   └── types/
│       └── coinrayjs.d.ts                 Type declarations for coinrayjs package
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .env                                   (you create this — gitignored)
└── .env.example                           Template for .env
```

---

## Related Documentation

- [Providers and Data Flow](./providers.md) — Detailed description of all three provider layers, their public APIs, internal buffer/replay mechanics, and code examples.
- [Extending the Client](./extending.md) — Replacing providers, adding UI features, multi-chart support, state persistence, and custom indicator categories.
- [Server Documentation](../../server/docs/index.md) — The matching server that this client connects to.
