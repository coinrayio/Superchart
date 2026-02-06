# CAUDE.md - Project Memory & Context

## Technical Decisions

### Coinray SDK Usage (2026-01-29)

**Correct Import Pattern**:
```typescript
// ✅ Correct (default export)
import Coinray from 'coinrayjs'
import { types } from 'coinrayjs'

// ❌ Incorrect (no named exports for CoinraySDK or Kline)
import { CoinraySDK, type Kline } from 'coinrayjs'
```

**Usage**:
- Main class: `Coinray` (default export)
- Types: Import from `types` named export
- Example: `type CoinrayCandle = types.Candle`
- Constructor: `new Coinray(token)` not `new CoinraySDK({ token })`
- API methods: `fetchCandles()`, `subscribeCandles()`, etc.

**Reference**: Based on the official coinrayjs package structure (v1.1.4+)

### Technical Indicators Implementation (2026-01-29)

**Decision**: Use the `talib` npm package for technical indicators implementation in `examples/server/src/runtime/indicators.ts`

**Rationale**:
- Access to 100+ battle-tested technical indicators from TA-Lib
- Shorter, more maintainable code
- Industry-standard implementations
- Better performance (native C bindings)
- Eliminates need to manually implement and maintain indicator calculations

**Package**: https://www.npmjs.com/package/talib

**Implementation Details**:
- Replace manual indicator implementations with talib function calls
- Maintain the same API interface for consistency
- Keep custom helper functions (crossover, crossunder) if not available in talib
- RMA (Wilder's Smoothing) may need custom implementation if talib doesn't provide direct equivalent

### Vite Environment Types (2026-01-29)

**Issue**: `import.meta.env` TypeScript errors in Vite projects

**Solution**: Create `vite-env.d.ts` in the src directory:
```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SCRIPT_SERVER_URL?: string
  readonly VITE_COINRAY_TOKEN?: string
  // Add other env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

This file is automatically picked up by TypeScript when included in tsconfig.json's `"include": ["src"]`.

---

## Project Structure

This is a React charting library (superchart) based on KLineChart with:
- **Core library** (`src/lib/`) - Superchart component, widgets, datafeed bridge, types
- **Examples server** (`examples/server/`) - WebSocket server for Pine Script execution
- **Examples client** (`examples/client/`) - Demo app using Superchart with scripts
- Widget components for chart UI
- Multilingual support (i18n)
- TypeScript throughout

### Example Client Architecture

The client demonstrates the full integration:

1. **Coinray Datafeed** (`examples/client/src/datafeed/CoinrayDatafeed.ts`)
   - Implements TradingView-compatible `Datafeed` interface
   - Uses `coinrayjs` to fetch historical candles and subscribe to real-time ticks
   - Wrapped with `createDataLoader()` to work with klinecharts

2. **WebSocket Script Provider** (`examples/client/src/script/WebSocketScriptProvider.ts`)
   - Implements `ScriptProvider` interface
   - Connects to the script execution server via WebSocket
   - Handles compile/execute/stop operations
   - Returns `IndicatorSubscription` for seamless integration with chart

3. **Main App** (`examples/client/src/App.tsx`)
   - Initializes Superchart with datafeed and script provider
   - Provides example Pine Scripts (RSI, MACD, Moving Averages, Bollinger Bands)
   - Users can load examples through the script editor widget (built into Superchart)

### Data Flow

```
Coinray API → CoinrayDatafeed → createDataLoader() → Superchart → Chart Display
                                                              ↓
Script Server ← WebSocketScriptProvider ← Script Editor Widget → Indicator Overlay
```

---

## Notes
- Main branch: (to be determined)
- Current branch: dev
