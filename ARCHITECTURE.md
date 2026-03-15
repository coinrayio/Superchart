# Superchart Architecture

> TradingView-grade charting library built on klinecharts

## Overview

Superchart is a charting library that provides professional-grade UI for financial data visualization. It's built on top of [klinecharts](https://klinecharts.com/) and follows patterns from coinray-chart-ui (SolidJS) ported to React.

**Key Features:**
- Class-based API for framework-agnostic usage
- Pluggable storage via `StorageAdapter` interface
- Backend-driven indicators via `IndicatorProvider` interface
- 18 custom overlay extensions (Fibonacci, waves, etc.)
- Full i18n support

## Installation & Usage

```typescript
import { Superchart } from 'superchart'
import 'superchart/styles'

const chart = new Superchart({
  container: 'chart-container',
  symbol: { ticker: 'BTCUSDT', pricePrecision: 2, volumePrecision: 0 },
  period: { span: 1, type: 'hour', text: '1H' },
  dataLoader: myDataLoader,
  storageAdapter: myStorageAdapter,  // Optional
  indicatorProvider: myIndicatorProvider,  // Optional
  theme: 'dark',
})

// API methods
chart.setSymbol({ ticker: 'ETHUSDT', ... })
chart.setPeriod({ span: 4, type: 'hour', text: '4H' })
chart.setTheme('light')
chart.resize()
chart.dispose()
```

---

## Directory Structure

```
src/lib/
├── components/           # React components
│   ├── Superchart.ts     # Main class-based API (entry point)
│   ├── SuperchartComponent.tsx  # React component wrapper
│   └── ChartWidget.tsx   # Core chart rendering
│
├── component/            # Base UI components
│   ├── button/
│   ├── checkbox/
│   ├── color/
│   ├── empty/
│   ├── input/
│   ├── list/
│   ├── loading/
│   ├── modal/
│   ├── popup/
│   ├── select/
│   └── switch/
│
├── widget/               # Chart UI widgets
│   ├── period-bar/       # Timeframe selector
│   ├── drawing-bar/      # Drawing tools sidebar
│   ├── indicator-modal/  # Indicator selection
│   ├── indicator-setting-modal/  # Indicator parameters
│   ├── timeframe-modal/  # Quick timeframe input
│   ├── timezone-modal/   # Timezone selection
│   ├── setting-modal/    # Chart settings
│   ├── screenshot-modal/ # Screenshot export
│   ├── symbol-search-modal/  # Symbol search
│   └── setting-floating/ # Overlay settings toolbar
│
├── extension/            # Custom overlay templates
│   ├── arrow.ts
│   ├── brush.ts
│   ├── circle.ts
│   ├── rect.ts
│   ├── triangle.ts
│   ├── parallelogram.ts
│   ├── fibonacciCircle.ts
│   ├── fibonacciSegment.ts
│   ├── fibonacciSpiral.ts
│   ├── fibonacciSpeedResistanceFan.ts
│   ├── fibonacciExtension.ts
│   ├── gannBox.ts
│   ├── threeWaves.ts
│   ├── fiveWaves.ts
│   ├── eightWaves.ts
│   ├── anyWaves.ts
│   ├── abcd.ts
│   ├── xabcd.ts
│   ├── utils.ts          # Shared geometry utilities
│   └── index.ts
│
├── store/                # Observable state management
│   ├── chartStore.ts     # Core chart state (symbol, period, theme, etc.)
│   ├── chartStateStore.ts  # State persistence (save/load indicators, overlays)
│   ├── tickStore.ts      # Real-time tick data
│   ├── overlaySettingStore.ts  # Overlay popup state
│   ├── keyEventStore.ts  # Keyboard shortcuts
│   └── index.ts
│
├── types/                # TypeScript definitions
│   ├── chart.ts          # Period, SymbolInfo, ProChart
│   ├── indicator.ts      # IndicatorProvider, IndicatorMetadata
│   ├── overlay.ts        # OverlayProperties, ProOverlay
│   ├── storage.ts        # StorageAdapter, ChartState
│   └── index.ts
│
├── hooks/                # React hooks
│   └── useChartState.ts  # Chart state subscription
│
├── i18n/                 # Internationalization
│   ├── en-US.json
│   ├── zh-CN.json
│   └── index.ts
│
├── helpers.ts            # Utility functions
├── base.less             # LESS variables and mixins
├── index.less            # Main stylesheet
└── index.ts              # Library entry point
```

---

## Public API

### Exports

```typescript
// Main class
export { Superchart }

// i18n
export { loadLocale }

// Types
export type { SuperchartOptions, SuperchartApi }
export type { Period, SymbolInfo, ProChart }
export type { StorageAdapter, ChartState }
export type { IndicatorProvider, IndicatorDefinition }
export type { OverlayProperties, ProOverlay, ProOverlayCreate }
export type { PaneProperties }
```

### SuperchartOptions

```typescript
interface SuperchartOptions {
  // Required
  container: string | HTMLElement
  symbol: SymbolInfo
  period: Period
  dataLoader: DataLoader

  // Optional - Backend indicators
  indicatorProvider?: IndicatorProvider

  // Optional - Storage
  storageAdapter?: StorageAdapter
  storageKey?: string  // Default: symbol.ticker

  // Optional - Initial state
  mainIndicators?: string[]
  subIndicators?: string[]

  // Optional - Customization
  locale?: string      // Default: 'en-US'
  theme?: 'light' | 'dark' | string
  timezone?: string    // Default: 'Etc/UTC'
  watermark?: string | Node
  styleOverrides?: DeepPartial<Styles>

  // Optional - UI toggles
  drawingBarVisible?: boolean  // Default: false
  showVolume?: boolean         // Default: true

  // Optional - Available options
  periods?: Period[]
}
```

### SuperchartApi

```typescript
interface SuperchartApi {
  setTheme(theme: string): void
  getTheme(): string
  setStyles(styles: DeepPartial<PaneProperties>): void
  getStyles(): DeepPartial<PaneProperties>
  setLocale(locale: string): void
  getLocale(): string
  setTimezone(timezone: string): void
  getTimezone(): string
  setSymbol(symbol: SymbolInfo): void
  getSymbol(): SymbolInfo
  setPeriod(period: Period): void
  getPeriod(): Period
  getChart(): Nullable<Chart>
  resize(): void
  getScreenshotUrl(type?: 'png' | 'jpeg', backgroundColor?: string): string
  createOverlay(overlay: OverlayCreate, paneId?: string): string | null
  setOverlayMode(mode: OverlayMode): void
  dispose(): void
}
```

---

## Key Interfaces

### StorageAdapter

```typescript
interface StorageAdapter {
  save(key: string, state: ChartState): Promise<void>
  load(key: string): Promise<ChartState | null>
  delete(key: string): Promise<void>
}

interface ChartState {
  version: number
  styles: DeepPartial<Styles>
  overlays: SavedOverlay[]
  indicators: SavedIndicator[]
  paneLayout: PaneLayout[]
  preferences: ChartPreferences
  savedAt: number
}
```

### IndicatorProvider

```typescript
interface IndicatorProvider {
  getAvailableIndicators(): Promise<IndicatorDefinition[]>
  subscribe(params: IndicatorSubscribeParams): Promise<IndicatorSubscription>
  updateSettings(indicatorId: string, settings: Record<string, unknown>): Promise<void>
  unsubscribe(indicatorId: string): Promise<void>
}
```

### Period & SymbolInfo

```typescript
interface Period {
  span: number
  type: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'
  text: string
}

interface SymbolInfo {
  ticker: string
  name?: string
  shortName?: string
  exchange?: string
  pricePrecision?: number
  volumePrecision?: number
  logo?: string
}
```

---

## State Management

The library uses an observable store pattern (similar to SolidJS signals) for framework-agnostic state management:

```typescript
// Store pattern
const [value, setValue, subscribe] = createSignal<T>(initialValue)

// Usage in stores
export const [symbol, setSymbol, subscribeSymbol] = createSignal<SymbolInfo | null>(null)
export const [period, setPeriod, subscribePeriod] = createSignal<Period | null>(null)
export const [theme, setTheme, subscribeTheme] = createSignal<string>('light')
```

### Stores

| Store | Purpose |
|-------|---------|
| `chartStore` | Core state: symbol, period, theme, locale, timezone, styles |
| `chartStateStore` | Persistence: save/load indicators, overlays, restore state |
| `tickStore` | Real-time: current tick data |
| `overlaySettingStore` | UI: overlay popup position and visibility |
| `keyEventStore` | Input: keyboard shortcuts, modal callbacks |

---

## Custom Overlays

18 custom overlay templates extending klinecharts:

| Category | Overlays |
|----------|----------|
| Basic | arrow, brush, circle, rect, triangle, parallelogram |
| Fibonacci | fibonacciCircle, fibonacciSegment, fibonacciSpiral, fibonacciSpeedResistanceFan, fibonacciExtension |
| Gann | gannBox |
| Waves | threeWaves, fiveWaves, eightWaves, anyWaves |
| Patterns | abcd, xabcd |

All overlays are automatically registered on import via:
```typescript
overlays.forEach(o => { registerOverlay(o) })
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+I` | Toggle indicator modal |
| `Ctrl+S` | Toggle settings modal |
| `Ctrl+P` | Take screenshot |
| `Ctrl+F` | Toggle fullscreen |
| `Ctrl+L` | Toggle order panel |
| `Delete` | Remove selected overlay |
| `Escape` | Close all modals |
| `1-9` | Quick timeframe selection |

---

## Build Output

```
dist/
├── index.d.ts         # Type declarations (~44KB)
├── superchart.es.js   # ES module (~1MB)
├── superchart.cjs.js  # CommonJS (~640KB)
└── superchart.css     # Styles (~28KB)
```

---

## Differences from coinray-chart-ui

| Aspect | coinray-chart-ui | Superchart |
|--------|------------------|------------|
| Framework | SolidJS | React (with class-based API) |
| Entry Point | React component only | Class + React component |
| Storage | localStorage only | Pluggable StorageAdapter |
| Indicators | Client-side calculation | Backend-driven via IndicatorProvider |
| State | SolidJS signals | Observable store pattern |
| Build | vite-plugin-solid | vite + dts-bundle-generator |

---

## Implementation Status

### Completed
- [x] Core chart integration (klinecharts)
- [x] Class-based Superchart API
- [x] All base UI components (11)
- [x] All widgets (10)
- [x] All stores (5)
- [x] All custom overlays (18)
- [x] i18n system
- [x] Storage adapter interface
- [x] Type exports and build configuration

### Pending
- [ ] IndicatorProvider integration with chart
- [ ] Backend indicator data flow
- [ ] Order panel widget (from coinray-chart-ui)
- [ ] Additional i18n locales
