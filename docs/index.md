# Superchart — Developer Guide

Superchart is a TradingView-style charting library built on [klinecharts](https://github.com/liihuu/KLineChart). It exposes a class-based, framework-agnostic API with React rendering internals, meaning you can drop it into any JavaScript environment — vanilla JS, React, Vue, Angular — without importing React yourself.

## Key Capabilities

- **Real-time OHLCV charts** — candlestick, bar, line, area, and Heikin-Ashi candle types via klinecharts.
- **Backend-driven indicators** — Superchart never calculates indicators itself. It receives pre-calculated data from your backend via `IndicatorProvider` and renders it using a calc-bridge pattern registered as klinecharts `IndicatorTemplate`s.
- **Server-side Pine Script execution** — an optional `ScriptProvider` interface allows users to write Pine Script (or any custom language) in the built-in code editor and execute it as a chart indicator via your backend.
- **25+ drawing tools** — trend lines, rays, channels, Fibonacci retracements, shapes, wave counts, Gann boxes, annotations, and order lines.
- **Order lines** — horizontal price-level overlays used to visualize open orders on the chart.
- **Persistent state** — `StorageAdapter` interface saves and restores indicator subscriptions, overlay drawings, styles, and preferences per symbol.
- **Themes** — `'light'` and `'dark'` built-ins; fine-grained overrides via `styleOverrides: DeepPartial<Styles>`.
- **i18n** — 10 built-in locales; extend with `loadLocale()`.
- **Screenshot** — `getScreenshotUrl()` renders the chart canvas to a data URL.
- **Symbol search** — built-in symbol search modal wired to your `Datafeed.searchSymbols`.

---

## Installation

Superchart is a local workspace package. In a monorepo using pnpm workspaces:

```bash
pnpm add superchart
```

Or with npm:

```bash
npm install superchart
```

Import the stylesheet alongside the library:

```typescript
import 'superchart/styles'   // compiled CSS
import Superchart from 'superchart'
```

### Peer Dependencies

React and ReactDOM are required peer dependencies (React 18 or 19):

```bash
pnpm add react react-dom
```

The script editor (CodeMirror) is optional. Install only if you plan to use `ScriptProvider`:

```bash
pnpm add @codemirror/view @codemirror/state @codemirror/commands \
         @codemirror/search @codemirror/language @codemirror/autocomplete \
         @codemirror/lint @lezer/highlight
```

---

## Quick Start (Vanilla JS)

The following example creates a minimal working chart with no framework. It uses a mock datafeed returning static bars.

```typescript
import 'superchart/styles'
import Superchart, { createDataLoader } from 'superchart'
import type { Datafeed, DatafeedConfiguration, LibrarySymbolInfo, Bar } from 'superchart'

// 1. Create a minimal Datafeed implementation
const datafeed: Datafeed = {
  onReady(callback: (config: DatafeedConfiguration) => void) {
    setTimeout(() => callback({ supportedResolutions: ['1', '5', '15', '60', '1D'] }), 0)
  },

  searchSymbols(_input, _exchange, _type, onResult) {
    onResult([])
  },

  resolveSymbol(symbolName, onResolve, onError) {
    if (symbolName === 'BTCUSDT') {
      onResolve({
        ticker: 'BTCUSDT',
        name: 'Bitcoin / USDT',
        pricescale: 100,
        has_intraday: true,
      })
    } else {
      onError('Symbol not found')
    }
  },

  getBars(_symbolInfo, _resolution, periodParams, onResult) {
    // Return mock bars spanning the requested range
    const bars: Bar[] = []
    const interval = 60_000 // 1-minute bars in ms
    const to = periodParams.to * 1000
    const from = periodParams.from * 1000
    let price = 50_000
    for (let t = from; t < to; t += interval) {
      const open = price
      const close = price + (Math.random() - 0.5) * 200
      bars.push({
        time: t,
        open,
        high: Math.max(open, close) + Math.random() * 50,
        low:  Math.min(open, close) - Math.random() * 50,
        close,
        volume: Math.floor(Math.random() * 1000),
      })
      price = close
    }
    onResult(bars, { noData: false })
  },

  subscribeBars(_symbolInfo, _resolution, onTick, _uid) {
    // Push a fake tick every second
    setInterval(() => {
      onTick({
        time: Date.now(),
        open: 50_000,
        high: 50_100,
        low:  49_900,
        close: 50_050,
        volume: 10,
      })
    }, 1000)
  },

  unsubscribeBars(_uid) {},
}

// 2. Wrap the Datafeed in a DataLoader
const dataLoader = createDataLoader(datafeed)

// 3. Mount the chart
const chart = new Superchart({
  container: 'chart',            // ID of an existing <div>
  symbol: {
    ticker: 'BTCUSDT',
    name: 'Bitcoin / USDT',
    pricePrecision: 2,
    volumePrecision: 0,
  },
  period: { type: 'minute', span: 1, text: '1m' },
  dataLoader,
  theme: 'dark',
})

// 4. The API is available immediately (synchronous after construction)
chart.setTheme('light')

// 5. Clean up when done
// chart.dispose()
```

---

## Directory Structure

```
src/lib/
├── components/
│   ├── Superchart.ts          # Main class (SuperchartOptions, SuperchartApi)
│   ├── SuperchartComponent.tsx # Internal React root component
│   └── ChartWidget.tsx        # klinecharts canvas wrapper
├── datafeed/
│   └── index.ts               # createDataLoader(), SuperchartDataLoader
├── hooks/
│   ├── useBackendIndicators.ts # Calc-bridge for IndicatorProvider
│   └── useChartState.ts        # Restore state from StorageAdapter
├── i18n/
│   ├── index.ts               # load(), i18n()
│   └── *.json                 # 10 locale files
├── store/
│   └── chartStore.ts          # Internal observable state
├── types/
│   ├── chart.ts               # Period, SymbolInfo, PERIODS, formatPeriod
│   ├── datafeed.ts            # Datafeed, Bar, PeriodParams, resolutionToPeriod, periodToResolution
│   ├── indicator.ts           # IndicatorProvider and all plot/data types
│   ├── overlay.ts             # SavedOverlay, BUILT_IN_OVERLAYS, createOrderLine
│   ├── script.ts              # ScriptProvider, ScriptEditorProps, BotSubscription
│   └── storage.ts             # StorageAdapter, ChartState, createEmptyChartState
├── widget/
│   ├── drawing-bar/           # Drawing toolbar UI
│   ├── indicator-modal/       # Indicator picker modal
│   ├── period-bar/            # Period selector toolbar
│   ├── script-editor/         # ScriptEditor React component
│   └── ...                    # Other UI widgets
└── index.ts                   # Public API surface
```

---

## Further Reading

| Document | Description |
|---|---|
| [api-reference.md](./api-reference.md) | Full TypeScript signatures for all options, API methods, and types |
| [data-loading.md](./data-loading.md) | Datafeed interface, createDataLoader, setOnBarsLoaded |
| [indicators.md](./indicators.md) | IndicatorProvider, IndicatorMetadata, plot types, calc-bridge internals |
| [scripts.md](./scripts.md) | ScriptProvider, ScriptEditor component, Pine Script execution |
| [storage.md](./storage.md) | StorageAdapter, ChartState persistence, example adapters |
| [overlays.md](./overlays.md) | Drawing tools, createOverlay, order lines, SavedOverlay |
| [customization.md](./customization.md) | Themes, styles, locale, timezone, periods, watermark |
