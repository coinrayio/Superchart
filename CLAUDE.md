# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Superchart is a TradingView-grade React charting library built on [klinecharts](https://klinecharts.com/). It provides a class-based, framework-agnostic API with pluggable storage, backend-driven indicators, and 18 custom overlay extensions. Originally ported from coinray-chart-ui (SolidJS).

## Commands

```bash
pnpm install              # Install dependencies (pnpm workspace with packages/coinray-chart submodule)
pnpm dev                  # Vite dev server
pnpm build                # Full build: tsc + vite library build + dts-bundle-generator
pnpm build:core           # TypeScript check + vite library build only
pnpm lint                 # ESLint
pnpm storybook            # Storybook dev server on port 6007
pnpm build-storybook      # Build static storybook
```

## Architecture

### Library entry point

`src/lib/index.ts` → exports `Superchart` class, `createDataLoader`, `loadLocale`, types, and re-exports from klinecharts.

### Core flow

```
Datafeed API → createDataLoader() → Superchart class → klinecharts Chart → React widgets
```

- **`Superchart`** (`src/lib/components/Superchart.ts`) — Main class-based API. Creates a React root, renders `SuperchartComponent`, and exposes methods like `setSymbol()`, `setPeriod()`, `setTheme()`, `dispose()`.
- **`SuperchartComponent`** (`src/lib/components/SuperchartComponent.tsx`) — React wrapper that bridges the class API to React.
- **`ChartWidget`** (`src/lib/components/ChartWidget.tsx`) — Core chart rendering component.

### State management

Observable store pattern using `createSignal<T>()` (SolidJS-inspired signals, defined in `src/lib/store/chartStore.ts`):

| Store | File | Purpose |
|-------|------|---------|
| `chartStore` | `store/chartStore.ts` | Core state: symbol, period, theme, locale, timezone, styles |
| `chartStateStore` | `store/chartStateStore.ts` | Persistence: save/load via StorageAdapter |
| `tickStore` | `store/tickStore.ts` | Real-time tick data |
| `overlaySettingStore` | `store/overlaySettingStore.ts` | Overlay popup position/visibility |
| `keyEventStore` | `store/keyEventStore.ts` | Keyboard shortcuts |

### Key interfaces

- **`DataLoader`** (klinecharts) / **`Datafeed`** (TradingView-compatible) — `createDataLoader()` in `src/lib/datafeed/` bridges between them.
- **`StorageAdapter`** — Pluggable persistence for chart state (indicators, overlays, preferences).
- **`IndicatorProvider`** — Backend-driven indicator subscription system.
- **`ScriptProvider`** — Pine Script compilation/execution interface.

### Directory layout

- `src/lib/component/` — Base UI primitives (button, modal, popup, select, etc.)
- `src/lib/widget/` — Chart-specific UI widgets (period-bar, drawing-bar, indicator-modal, etc.)
- `src/lib/extension/` — 18 custom overlay templates (Fibonacci, waves, Gann, shapes)
- `src/lib/i18n/` — Internationalization (en-US, zh-CN)
- `src/lib/types/` — TypeScript type definitions

### packages/coinray-chart (git submodule)

A fork of [KLineChart](https://klinecharts.com/) (v10 beta) — the underlying HTML5 canvas charting engine. Linked as a pnpm workspace package (`"klinecharts": "workspace:*"`). When modifying chart rendering, overlay registration, or the `DataLoader`/`Chart` APIs, changes go here. Build with `npm run build` inside the submodule directory.

### examples/client

React demo app showing full Superchart integration. Run with `cd examples/client && pnpm dev`.

Key files:
- `src/App.tsx` — Initializes Superchart with datafeed, script provider, and example Pine Scripts
- `src/datafeed/CoinrayDatafeed.ts` — TradingView-compatible `Datafeed` implementation using `coinrayjs`; wrapped with `createDataLoader()` for klinecharts
- `src/script/WebSocketScriptProvider.ts` — `ScriptProvider` implementation connecting to the script server via WebSocket (compile/execute/stop)

### examples/server

WebSocket server for Pine Script compilation and execution. Run with `cd examples/server && pnpm dev` (uses `tsx watch`).

Key files:
- `src/index.ts` — WebSocket server entry point
- `src/runtime/indicators.ts` — Technical indicator implementations using the `talib` npm package (native TA-Lib bindings)
- `src/coinrayClient.ts` — Coinray API client for fetching candle data server-side
- `src/db.ts` — SQLite persistence via `better-sqlite3`

Uses `talib` for 100+ indicators. Custom helpers (crossover, crossunder) and RMA (Wilder's Smoothing) may be implemented manually where talib lacks direct equivalents.

### Data flow across examples

```
Coinray API → CoinrayDatafeed → createDataLoader() → Superchart → Chart Display
                                                              ↓
Script Server ← WebSocketScriptProvider ← Script Editor Widget → Indicator Overlay
```

### Build output

Library builds to `dist/` as ES module (`superchart.es.js`), CommonJS (`superchart.cjs.js`), CSS (`superchart.css`), and bundled types (`index.d.ts` via dts-bundle-generator).

### Storybook

Stories live in `.storybook/overlay-stories/`. Stubs in `.storybook/overlay-stories/overlays/` define API contracts that the library implements. The `@superchart` alias maps to `src/lib/` in storybook's vite config.

### Styling

Uses LESS for stylesheets. Variables and mixins in `src/lib/base.less`, main styles in `src/lib/index.less`.

## Re-export policy (klinecharts → Superchart)

Consumers should import from `superchart`, not `klinecharts`. When adding new types or factory functions to `packages/coinray-chart`:

1. Export the new type/function from `packages/coinray-chart/src/index.ts`
2. Re-export it from `src/lib/index.ts` (Superchart's entry point)

**DO re-export** (consumer-facing):
- Factory functions: `createOrderLine`, `createPriceLine`, `createTradeLine`
- Core types consumers reference: `Chart`, `Nullable`, `DeepPartial`, `KLineData`, `Point`, `Styles`
- Overlay types: `Overlay`, `OverlayCreate`, `OverlayEvent`, `OverlayProperties`, `ProOverlayTemplate`
- Indicator types: `Indicator`, `IndicatorCreate`
- Fluent API types: `OrderLine`, `PriceLine`, `TradeLine` and their `*Properties` interfaces

**DO NOT re-export** (engine internals):
- Rendering: `View`, `Widget`, `Pane`, `DrawPane`, `Figure`, `FigureImp`
- Axes: `XAxis`, `YAxis`, `Axis`
- Internal state: `Store`, `Action`, `EventHandler`
- Canvas utilities: `Canvas`, `Bounding`, `Coordinate`
- Registration functions: `registerFigure`, `registerOverlay`, `registerIndicator` (Superchart handles registration)
- Internal helpers: `utils`, `isProOverlayTemplate`, `createPropertiesStore`

## Coinray SDK usage

```typescript
// Correct (default export, no named CoinraySDK export)
import Coinray from 'coinrayjs'
import { types } from 'coinrayjs'

// Constructor: new Coinray(token)  — NOT new CoinraySDK({ token })
// Types: types.Candle, etc.
// API methods: fetchCandles(), subscribeCandles(), etc.
```

## Path aliases

- `@` → `src/` (vite.config.ts)
- `@superchart` → `src/lib/` (storybook vite config only)

## Vite environment types

For `import.meta.env` TypeScript support, projects use a `vite-env.d.ts` in their src directory:
```typescript
/// <reference types="vite/client" />
```
The examples/client uses env vars `VITE_SCRIPT_SERVER_URL` and `VITE_COINRAY_TOKEN`.
