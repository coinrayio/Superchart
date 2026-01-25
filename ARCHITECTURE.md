# Superchart Architecture

> TradingView-grade charting library for React with backend-driven indicators

## Overview

Superchart is a React charting library that renders financial data with professional-grade UI similar to TradingView. Unlike TradingView which executes Pine Script on the frontend, Superchart is designed for **backend-calculated indicators** - the library provides interfaces and components for displaying pre-computed indicator data.

## Core Design Principles

1. **No Frontend Calculations** - All indicator/overlay calculations happen on the backend
2. **Pluggable Storage** - Users implement their own storage adapter (localStorage, API, IndexedDB, etc.)
3. **Backend-Driven Data** - Indicators and overlays receive data via props/callbacks, not internal calculations
4. **Extensible** - Custom overlays, indicators, and drawing tools can be registered
5. **Framework Agnostic Core** - UI in React, but core charting logic is vanilla TypeScript
6. **Reuse Base Library Types** - Import types from klinecharts, only extend what's needed

## Type Strategy

Following the pattern from coinray-chart-ui:

- **Import, don't redeclare** - Types like `KLineData`, `Overlay`, `OverlayMode`, `Styles` come from klinecharts
- **Extend with `&` or `extends`** - Add new properties to base types (e.g., `Period extends BasePeriod`)
- **Use `string` for names** - Overlay/indicator names are `string`, not union types, to allow custom overlays
- **Only create new types for new features** - `StorageAdapter`, `IndicatorProvider`, `SavedOverlay` are new
- **Re-export for convenience** - Export klinecharts types from our index so users have one import

```typescript
// Good: Import and extend
import type { Period as BasePeriod } from 'klinecharts'
export interface Period extends BasePeriod {
  text: string  // Only add what's new
}

// Good: Use string for extensibility
name: string  // Allows custom overlays/indicators

// Bad: Don't redeclare existing types
// interface KLineData { ... }  // Already in klinecharts!
```

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                             │
│  (User's React App - implements storage, fetches data)           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Superchart Components                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│  │ <Superchart>│ │<Toolbar>    │ │<DrawingBar> │                │
│  │             │ │             │ │             │                │
│  └─────────────┘ └─────────────┘ └─────────────┘                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│  │<IndicatorPn>│ │<SettingsMdl>│ │<OverlayMdl> │                │
│  │             │ │             │ │             │                │
│  └─────────────┘ └─────────────┘ └─────────────┘                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    State Management Layer                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ChartContext - React Context for chart state              │   │
│  │ - symbol, period, timezone                                │   │
│  │ - activeIndicators[], activeOverlays[]                    │   │
│  │ - chartStyles, paneLayout                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ StorageAdapter Interface - User implements persistence    │   │
│  │ - save/load indicators, overlays, styles, layout          │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Core Charting Engine                          │
│  (KlineCharts - HTML5 Canvas rendering)                          │
│  - Panes (Candle, Indicator, XAxis, Separator)                  │
│  - Figures (line, rect, circle, text, path)                     │
│  - Coordinate conversion (data ↔ pixel)                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
src/lib/
├── components/
│   ├── Superchart/              # Main chart component
│   │   ├── Superchart.tsx
│   │   ├── SuperchartContext.tsx
│   │   └── index.ts
│   ├── Toolbar/                 # Top toolbar (period, symbol, settings)
│   │   ├── Toolbar.tsx
│   │   ├── PeriodSelector.tsx
│   │   ├── SymbolSelector.tsx
│   │   └── index.ts
│   ├── DrawingBar/              # Left sidebar with drawing tools
│   │   ├── DrawingBar.tsx
│   │   ├── DrawingTool.tsx
│   │   └── index.ts
│   ├── Modals/                  # Modal dialogs
│   │   ├── IndicatorModal.tsx
│   │   ├── SettingsModal.tsx
│   │   ├── OverlaySettingsModal.tsx
│   │   └── index.ts
│   └── common/                  # Shared UI components
│       ├── Button.tsx
│       ├── Select.tsx
│       ├── ColorPicker.tsx
│       ├── Modal.tsx
│       └── index.ts
│
├── hooks/
│   ├── useChart.ts              # Access chart instance & context
│   ├── useIndicators.ts         # Manage backend indicators
│   ├── useOverlays.ts           # Manage drawing overlays
│   ├── useStorage.ts            # Interface with storage adapter
│   └── index.ts
│
├── types/
│   ├── chart.ts                 # KLineData, SymbolInfo, Period
│   ├── indicator.ts             # IndicatorMetadata, IndicatorData
│   ├── overlay.ts               # OverlayTemplate, OverlayState
│   ├── storage.ts               # StorageAdapter interface
│   ├── styles.ts                # ChartStyles, PaneStyles
│   └── index.ts
│
├── core/
│   ├── Chart.ts                 # Chart instance wrapper
│   ├── IndicatorRegistry.ts     # Register/manage indicators
│   ├── OverlayRegistry.ts       # Register/manage overlays
│   ├── DataCache.ts             # Timestamp-indexed data cache
│   └── index.ts
│
├── utils/
│   ├── plotMapping.ts           # Convert IndicatorMetadata to figures
│   ├── coordinates.ts           # Data ↔ pixel conversion helpers
│   ├── serialization.ts         # State serialization for storage
│   └── index.ts
│
├── styles/
│   └── index.css                # Default styles
│
└── index.ts                     # Main exports
```

---

## Key Interfaces

### 1. Storage Adapter (User Implements)

```typescript
/**
 * Storage adapter interface for persisting chart state.
 * Users implement this to save to localStorage, API, IndexedDB, etc.
 */
interface StorageAdapter {
  /**
   * Save chart state. Called when indicators, overlays, or settings change.
   * @param key - Unique key for this chart (e.g., symbol + userId)
   * @param state - Serialized chart state
   */
  save(key: string, state: ChartState): Promise<void>

  /**
   * Load chart state. Called on chart initialization.
   * @param key - Unique key for this chart
   * @returns Saved state or null if none exists
   */
  load(key: string): Promise<ChartState | null>

  /**
   * Delete saved state.
   * @param key - Unique key for this chart
   */
  delete(key: string): Promise<void>
}

/**
 * Serializable chart state
 */
interface ChartState {
  version: number
  indicators: SavedIndicator[]
  overlays: SavedOverlay[]
  styles: Partial<ChartStyles>
  paneLayout: PaneLayout[]
  preferences: ChartPreferences
}

interface SavedIndicator {
  id: string
  name: string
  paneId: string
  settings: Record<string, number | boolean | string>
  visible: boolean
}

interface SavedOverlay {
  id: string
  name: string
  paneId: string
  points: OverlayPoint[]
  styles: Partial<OverlayStyles>
  locked: boolean
  visible: boolean
}
```

**Example Implementations:**

```typescript
// localStorage adapter
const localStorageAdapter: StorageAdapter = {
  async save(key, state) {
    localStorage.setItem(`superchart:${key}`, JSON.stringify(state))
  },
  async load(key) {
    const data = localStorage.getItem(`superchart:${key}`)
    return data ? JSON.parse(data) : null
  },
  async delete(key) {
    localStorage.removeItem(`superchart:${key}`)
  }
}

// API adapter
const apiStorageAdapter: StorageAdapter = {
  async save(key, state) {
    await fetch(`/api/charts/${key}`, {
      method: 'PUT',
      body: JSON.stringify(state)
    })
  },
  async load(key) {
    const res = await fetch(`/api/charts/${key}`)
    return res.ok ? res.json() : null
  },
  async delete(key) {
    await fetch(`/api/charts/${key}`, { method: 'DELETE' })
  }
}
```

---

### 2. Indicator Data Interface (Backend Provides)

```typescript
/**
 * Metadata describing an indicator's visual appearance.
 * Sent once when indicator is subscribed.
 */
interface IndicatorMetadata {
  name: string                    // Unique identifier
  shortName: string               // Display name (e.g., "RSI")
  precision: number               // Decimal places
  paneId: string                  // 'candle_pane' for overlays, unique for separate pane

  plots: IndicatorPlot[]          // Visual elements to render
  settings: IndicatorSetting[]    // Configurable parameters

  // Optional
  minValue?: number               // Y-axis minimum (e.g., 0 for RSI)
  maxValue?: number               // Y-axis maximum (e.g., 100 for RSI)
}

/**
 * Plot types matching TradingView/PineScript conventions
 */
type IndicatorPlot =
  | PlotLine          // plot() - lines, step lines, areas
  | PlotHistogram     // histogram() - vertical bars
  | PlotHLine         // hline() - horizontal reference lines
  | PlotShape         // plotshape() - shapes at points
  | PlotChar          // plotchar() - character markers
  | PlotFill          // fill() - fill between two plots
  | PlotBgColor       // bgcolor() - bar background colors
  | PlotCandle        // plotcandle() - OHLC candles
  | PlotArrow         // plotarrow() - directional arrows

interface PlotLine {
  type: 'plot'
  id: string
  title: string
  style: 'line' | 'stepline' | 'stepline_diamond' | 'circles' | 'cross' | 'area'
  color: string
  lineWidth?: number
  offset?: number
}

interface PlotHistogram {
  type: 'histogram'
  id: string
  title: string
  color: string
  histBase?: number              // Base value (default 0)
}

interface PlotHLine {
  type: 'hline'
  id: string
  price: number                  // Y-axis value
  color: string
  lineStyle?: 'solid' | 'dashed' | 'dotted'
  lineWidth?: number
}

interface PlotShape {
  type: 'plotshape'
  id: string
  style: 'triangleup' | 'triangledown' | 'circle' | 'cross' | 'diamond' | 'flag' | 'label'
  location: 'abovebar' | 'belowbar' | 'top' | 'bottom' | 'absolute'
  color: string
  size?: 'tiny' | 'small' | 'normal' | 'large' | 'huge'
  text?: string
}

/**
 * Single data point for an indicator
 */
interface IndicatorDataPoint {
  timestamp: number
  values: Record<string, number | null>   // plotId -> value
  colors?: Record<string, string>         // Dynamic per-bar colors
  shapes?: Record<string, boolean>        // Show/hide shapes
  texts?: Record<string, string>          // Text labels
}

/**
 * Indicator setting definition
 */
interface IndicatorSetting {
  id: string
  name: string
  type: 'number' | 'boolean' | 'string' | 'color' | 'select'
  defaultValue: number | boolean | string
  min?: number
  max?: number
  step?: number
  options?: { value: string; label: string }[]
}
```

---

### 3. Data Loader Interface

```typescript
/**
 * Interface for loading OHLC candle data.
 * Users implement this to fetch from their data source.
 */
interface DataLoader {
  /**
   * Load historical bars
   */
  getBars(params: GetBarsParams): Promise<GetBarsResult>

  /**
   * Subscribe to real-time bar updates (optional)
   */
  subscribeBar?(params: SubscribeParams): () => void

  /**
   * Get available symbols (optional, for symbol search)
   */
  searchSymbols?(query: string): Promise<SymbolInfo[]>
}

interface GetBarsParams {
  symbol: SymbolInfo
  period: Period
  from: number                   // Unix timestamp
  to: number                     // Unix timestamp
  firstRequest: boolean          // True if initial load
}

interface GetBarsResult {
  bars: KLineData[]
  hasMore: boolean               // More historical data available
}

interface SubscribeParams {
  symbol: SymbolInfo
  period: Period
  onUpdate: (bar: KLineData) => void
}

interface KLineData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
  turnover?: number
}

interface SymbolInfo {
  ticker: string                 // e.g., "BTCUSDT"
  name: string                   // e.g., "Bitcoin / USDT"
  exchange: string               // e.g., "BINANCE"
  pricePrecision: number         // Decimal places for price
  volumePrecision: number        // Decimal places for volume
  minMove?: number               // Minimum price movement
  logo?: string                  // Logo URL
}

interface Period {
  multiplier: number             // e.g., 1, 5, 15
  timespan: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month'
}
```

---

### 4. Indicator Provider Interface

```typescript
/**
 * Interface for providing indicator data from backend.
 * Users implement this to connect to their indicator service.
 */
interface IndicatorProvider {
  /**
   * Get list of available indicators
   */
  getAvailableIndicators(): Promise<IndicatorDefinition[]>

  /**
   * Subscribe to an indicator
   */
  subscribe(params: IndicatorSubscribeParams): Promise<IndicatorSubscription>

  /**
   * Update indicator settings
   */
  updateSettings(indicatorId: string, settings: Record<string, any>): Promise<void>

  /**
   * Unsubscribe from an indicator
   */
  unsubscribe(indicatorId: string): Promise<void>
}

interface IndicatorDefinition {
  name: string
  shortName: string
  description: string
  category: string               // e.g., "Trend", "Oscillator", "Volume"
  defaultSettings: Record<string, any>
  paneId: string                 // 'candle_pane' or unique pane id
}

interface IndicatorSubscribeParams {
  indicatorName: string
  symbol: SymbolInfo
  period: Period
  settings: Record<string, any>
}

interface IndicatorSubscription {
  indicatorId: string
  metadata: IndicatorMetadata

  /**
   * Callback for receiving initial data and updates
   */
  onData: (handler: (data: IndicatorDataPoint[]) => void) => void

  /**
   * Callback for receiving real-time tick updates
   */
  onTick: (handler: (data: IndicatorDataPoint) => void) => void
}
```

---

## Component API

### Superchart Component

```tsx
interface SuperchartProps {
  // Required
  symbol: SymbolInfo
  period: Period
  dataLoader: DataLoader

  // Optional - Backend indicators
  indicatorProvider?: IndicatorProvider

  // Optional - Storage
  storageAdapter?: StorageAdapter
  storageKey?: string            // Key for saving state (default: symbol.ticker)

  // Optional - Initial state
  defaultIndicators?: string[]   // Indicator names to load on mount
  defaultStyles?: Partial<ChartStyles>

  // Optional - Customization
  locale?: string                // 'en-US', 'zh-CN', etc.
  theme?: 'light' | 'dark' | ChartStyles
  timezone?: string              // IANA timezone

  // Optional - UI toggles
  showToolbar?: boolean          // Default: true
  showDrawingBar?: boolean       // Default: true
  showVolume?: boolean           // Default: true

  // Optional - Available options
  periods?: Period[]             // Available period options
  drawingTools?: string[]        // Available drawing tools

  // Events
  onSymbolChange?: (symbol: SymbolInfo) => void
  onPeriodChange?: (period: Period) => void
  onIndicatorAdd?: (indicator: IndicatorMetadata) => void
  onIndicatorRemove?: (indicatorId: string) => void
  onOverlayDraw?: (overlay: OverlayState) => void
  onStateChange?: (state: ChartState) => void

  // Refs
  chartRef?: React.RefObject<ChartAPI>
}
```

**Usage Example:**

```tsx
import { Superchart, StorageAdapter, DataLoader, IndicatorProvider } from 'superchart'
import 'superchart/styles'

// Implement data loader
const dataLoader: DataLoader = {
  async getBars({ symbol, period, from, to }) {
    const res = await fetch(`/api/candles?symbol=${symbol.ticker}&period=${period.multiplier}${period.timespan}&from=${from}&to=${to}`)
    const bars = await res.json()
    return { bars, hasMore: bars.length > 0 }
  },
  subscribeBar({ symbol, period, onUpdate }) {
    const ws = new WebSocket(`wss://api.example.com/stream/${symbol.ticker}`)
    ws.onmessage = (e) => onUpdate(JSON.parse(e.data))
    return () => ws.close()
  }
}

// Implement indicator provider (connects to your backend)
const indicatorProvider: IndicatorProvider = {
  async getAvailableIndicators() {
    return [
      { name: 'RSI', shortName: 'RSI', category: 'Oscillator', ... },
      { name: 'MACD', shortName: 'MACD', category: 'Momentum', ... },
    ]
  },
  async subscribe({ indicatorName, symbol, period, settings }) {
    const ws = connectToIndicatorService()
    ws.send(JSON.stringify({ type: 'subscribe', indicatorName, symbol, period, settings }))
    // Return subscription object with callbacks
  },
  // ...
}

// Implement storage adapter
const storage: StorageAdapter = {
  async save(key, state) {
    await fetch(`/api/charts/${key}`, { method: 'PUT', body: JSON.stringify(state) })
  },
  async load(key) {
    const res = await fetch(`/api/charts/${key}`)
    return res.ok ? res.json() : null
  },
  async delete(key) {
    await fetch(`/api/charts/${key}`, { method: 'DELETE' })
  }
}

function App() {
  return (
    <Superchart
      symbol={{ ticker: 'BTCUSDT', name: 'Bitcoin', exchange: 'BINANCE', pricePrecision: 2, volumePrecision: 4 }}
      period={{ multiplier: 1, timespan: 'hour' }}
      dataLoader={dataLoader}
      indicatorProvider={indicatorProvider}
      storageAdapter={storage}
      storageKey="user123:BTCUSDT"
      theme="dark"
      periods={[
        { multiplier: 1, timespan: 'minute' },
        { multiplier: 5, timespan: 'minute' },
        { multiplier: 1, timespan: 'hour' },
        { multiplier: 1, timespan: 'day' },
      ]}
      onIndicatorAdd={(ind) => console.log('Added:', ind.name)}
    />
  )
}
```

---

## State Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                     User Adds Indicator                           │
└────────────────────────────┬─────────────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 1. UI calls indicatorProvider.subscribe()                         │
└────────────────────────────┬─────────────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. Backend returns IndicatorSubscription with metadata + data     │
└────────────────────────────┬─────────────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. IndicatorRegistry creates KlineCharts indicator from metadata  │
│    - Converts plots to KlineCharts figures                        │
│    - Sets up calc() to read from DataCache                        │
└────────────────────────────┬─────────────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 4. DataCache populated with IndicatorDataPoints                   │
│    - Indexed by timestamp for O(1) lookup                         │
└────────────────────────────┬─────────────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 5. Chart renders indicator using cached data                      │
└────────────────────────────┬─────────────────────────────────────┘
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 6. State saved via storageAdapter.save()                          │
│    - Indicator name, settings, visibility                         │
│    - NOT the data (recalculated on load)                          │
└──────────────────────────────────────────────────────────────────┘
```

---

## Drawing Overlays System

Drawing overlays (trend lines, Fibonacci, etc.) are rendered client-side but their **coordinates and styles** are saved:

```typescript
interface OverlayTemplate {
  name: string                   // Unique identifier
  totalStep: number              // Points needed to complete (e.g., 2 for line)
  needDefaultPointFigure: boolean
  needDefaultXAxisFigure: boolean
  needDefaultYAxisFigure: boolean

  createPointFigures: (params: CreatePointFiguresParams) => OverlayFigure[]
  createXAxisFigures?: (params: CreateAxisFiguresParams) => OverlayFigure[]
  createYAxisFigures?: (params: CreateAxisFiguresParams) => OverlayFigure[]

  // Events
  onDrawStart?: (event: OverlayEvent) => boolean
  onDrawing?: (event: OverlayEvent) => boolean
  onDrawEnd?: (event: OverlayEvent) => boolean
  onClick?: (event: OverlayEvent) => boolean
  onRightClick?: (event: OverlayEvent) => boolean
  onPressedMoveStart?: (event: OverlayEvent) => boolean
  onPressedMoving?: (event: OverlayEvent) => boolean
  onPressedMoveEnd?: (event: OverlayEvent) => boolean
}

// Built-in overlays (from KlineCharts)
const BUILT_IN_OVERLAYS = [
  // Lines
  'horizontalStraightLine',
  'verticalStraightLine',
  'straightLine',
  'rayLine',
  'segment',
  'priceLine',

  // Channels
  'parallelStraightLine',
  'priceChannelLine',

  // Fibonacci
  'fibonacciLine',
  'fibonacciSegment',
  'fibonacciCircle',
  'fibonacciFan',
  'fibonacciExtension',

  // Shapes
  'circle',
  'rect',
  'triangle',
  'parallelogram',

  // Annotations
  'simpleAnnotation',
  'simpleTag',
]
```

---

## Implementation Phases

### Phase 1: Core Foundation
- [ ] Set up KlineCharts integration as core engine
- [ ] Create ChartContext and state management
- [ ] Implement DataLoader interface and data fetching
- [ ] Basic Superchart component with candle rendering

### Phase 2: Storage System
- [ ] Define StorageAdapter interface
- [ ] Implement state serialization/deserialization
- [ ] Create useStorage hook
- [ ] Add auto-save on state changes

### Phase 3: Backend Indicators
- [ ] Define IndicatorProvider interface
- [ ] Create IndicatorRegistry for managing indicators
- [ ] Implement DataCache for timestamp-indexed lookup
- [ ] Build plotMapping utility for metadata → figures conversion
- [ ] Add indicator modal UI

### Phase 4: Drawing Overlays
- [ ] Integrate KlineCharts overlay system
- [ ] Create DrawingBar component with tool selection
- [ ] Implement overlay state persistence
- [ ] Add overlay settings modal

### Phase 5: UI Components
- [ ] Toolbar component (period, symbol, settings)
- [ ] Settings modal for chart customization
- [ ] Color picker, input, select components
- [ ] Theme system (light/dark)

### Phase 6: Polish
- [ ] Keyboard shortcuts
- [ ] Touch/mobile support
- [ ] Screenshot export
- [ ] Internationalization
- [ ] Documentation

---

## Key Differences from coinray-chart-ui

| Aspect | coinray-chart-ui | Superchart |
|--------|------------------|------------|
| Framework | SolidJS | React |
| Storage | localStorage only | Pluggable StorageAdapter |
| Indicators | Client-side calculation | Backend-driven via IndicatorProvider |
| State | Global signals | React Context |
| Persistence | Auto-save to localStorage | User controls via adapter |

---

## Key Differences from klinecharts-examples

| Aspect | klinecharts-examples | Superchart |
|--------|---------------------|------------|
| Transport | WebSocket-specific | Provider interface (any transport) |
| Coupling | Tightly coupled to WS | Loosely coupled via interfaces |
| Storage | None | Full persistence system |
| UI | Demo-quality | Production-ready TV-like UI |
