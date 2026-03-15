# Superchart Examples

This directory contains example implementations demonstrating the superchart library with real-time data and server-side script execution.

## Architecture

### Client (`examples/client/`)

A React app demonstrating full integration of Superchart with:
- **Coinray Datafeed**: Real-time crypto market data from Coinray API
- **Script Execution**: WebSocket connection to script server for Pine Script indicators
- **Example Scripts**: Pre-built Pine Script examples (RSI, MACD, MA, Bollinger Bands)

#### Key Files:
- `src/App.tsx` - Main application with Superchart initialization
- `src/datafeed/CoinrayDatafeed.ts` - TradingView-compatible datafeed using coinrayjs
- `src/script/WebSocketScriptProvider.ts` - ScriptProvider implementation for server communication

### Server (`examples/server/`)

WebSocket server for Pine Script compilation and execution using TA-Lib for 100+ technical indicators.

## Quick Start

1. Install dependencies: `pnpm install` (from repo root)
2. Configure `.env` files (see Configuration section)
3. Start server: `cd examples/server && pnpm dev`
4. Start client: `cd examples/client && pnpm dev`
5. Open http://localhost:3000

See full documentation in this file.
