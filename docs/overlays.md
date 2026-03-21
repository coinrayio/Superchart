# Drawing Tools & Overlays

Overlays are interactive canvas elements drawn on top of the chart. They include:
- **Drawing tools**: trend lines, Fibonacci retracements, shapes, wave counts, annotations.
- **Order lines**: horizontal price-level lines used to visualize open orders.

---

## Showing the Drawing Toolbar

The drawing toolbar is hidden by default. Enable it at construction time or toggle it at runtime:

```typescript
// Show on creation
const chart = new Superchart({
  drawingBarVisible: true,
  // ...
})

// Toggle at runtime via the internal store
// (exposed via the period bar menu button in the default UI)
```

The drawing bar appears on the left side of the chart and contains buttons for all built-in overlay categories.

---

## Programmatic Overlay Creation

Use `createOverlay` to add overlays without user interaction.

```typescript
createOverlay(
  overlay: OverlayCreate & { properties?: DeepPartial<OverlayProperties> },
  paneId?: string
): string | null
```

`OverlayCreate` is the klinecharts overlay creation type. The `properties` extension allows setting visual properties at creation time.

```typescript
// Add a horizontal line at a fixed price
chart.createOverlay({
  name: 'horizontalStraightLine',
  points: [{ timestamp: Date.now(), value: 50000 }],
  properties: {
    line: { color: '#FF5252', size: 2, style: 'dashed' },
  },
})

// Add a trend line
chart.createOverlay({
  name: 'segment',
  points: [
    { timestamp: startTs, value: 48000 },
    { timestamp: endTs, value: 52000 },
  ],
})

// Target a specific sub-pane
chart.createOverlay(
  { name: 'horizontalStraightLine', points: [{ timestamp: Date.now(), value: 70 }] },
  'rsi_pane_id'
)
```

### Return value

Returns the overlay ID string on success, or `null` if the chart is not yet initialized.

---

## Overlay Mode

```typescript
setOverlayMode(mode: OverlayMode): void
```

Controls how overlays respond to user interaction.

| Mode | Behavior |
|---|---|
| `'normal'` | Overlays can be selected, moved, and resized |
| `'lock'` | Overlays cannot be moved or deleted |

---

## OverlayProperties

Styling properties available on all overlays. Part of the klinecharts `OverlayProperties` type.

```typescript
export interface OverlayProperties {
  line: {
    color: string
    size: number
    style: 'solid' | 'dashed' | 'dotted'
    dashedValue?: number[]
  }
  text: {
    color: string
    size: number
    family: string
    weight: string
    paddingLeft?: number
    paddingRight?: number
    paddingTop?: number
    paddingBottom?: number
    borderRadius?: number
    borderSize?: number
    borderColor?: string
    backgroundColor?: string
    borderStyle?: string
  }
  point: {
    color: string
    borderColor: string
    borderSize: number
    radius: number
    activeRadius: number
    activeColor: string
    activeBorderColor: string
    activeBorderSize: number
  }
  polygon: {
    color: string
    borderColor: string
    borderSize: number
    borderStyle: string
  }
  arc: {
    color: string
    borderColor: string
    borderSize: number
    borderStyle: string
  }
}
```

### DEFAULT_OVERLAY_PROPERTIES

A pre-built `OverlayProperties` object with default values, re-exported from klinecharts. Use it as a base for merging custom styles:

```typescript
import { DEFAULT_OVERLAY_PROPERTIES } from 'superchart'

const myProperties = {
  ...DEFAULT_OVERLAY_PROPERTIES,
  line: { ...DEFAULT_OVERLAY_PROPERTIES.line, color: '#FF5252' },
}
```

---

## BUILT_IN_OVERLAYS

All 29 built-in overlay type names:

```typescript
export const BUILT_IN_OVERLAYS = [
  // Lines
  'horizontalStraightLine',  // Infinite horizontal line
  'verticalStraightLine',    // Infinite vertical line
  'straightLine',            // Infinite diagonal line through two points
  'rayLine',                 // Ray extending from one point through another
  'segment',                 // Finite line segment between two points
  'priceLine',               // Horizontal line with price label

  // Channels
  'parallelStraightLine',    // Two parallel straight lines
  'priceChannelLine',        // Price channel with three defining points

  // Fibonacci
  'fibonacciLine',           // Fibonacci retracement levels
  'fibonacciSegment',        // Fibonacci with segment visualization
  'fibonacciCircle',         // Fibonacci circle arcs
  'fibonacciSpiral',         // Fibonacci spiral
  'fibonacciSpeedResistanceFan', // Speed/resistance fan lines
  'fibonacciExtension',      // Fibonacci extension levels

  // Shapes
  'rect',                    // Rectangle
  'circle',                  // Circle
  'triangle',                // Triangle
  'parallelogram',           // Parallelogram
  'arc',                     // Arc
  'arrow',                   // Arrow
  'brush',                   // Freehand brush stroke

  // Annotations
  'simpleAnnotation',        // Text annotation
  'simpleTag',               // Price tag

  // Waves
  'threeWaves',              // Elliott 3-wave count
  'fiveWaves',               // Elliott 5-wave count
  'eightWaves',              // Elliott 8-wave count
  'anyWaves',                // Flexible wave count
  'abcd',                    // ABCD harmonic pattern
  'xabcd',                   // XABCD harmonic pattern

  // Gann
  'gannBox',                 // Gann square

  // Order line
  'orderLine',               // Horizontal order price line
] as const
```

Overlays are grouped into categories for the drawing bar UI:

| Category | Overlays |
|---|---|
| Lines | horizontalStraightLine, verticalStraightLine, straightLine, rayLine, segment, priceLine |
| Channels | parallelStraightLine, priceChannelLine |
| Fibonacci | fibonacciLine, fibonacciSegment, fibonacciCircle, fibonacciSpiral, fibonacciSpeedResistanceFan, fibonacciExtension |
| Shapes | rect, circle, triangle, parallelogram, arc, arrow, brush |
| Annotations | simpleAnnotation, simpleTag |
| Waves | threeWaves, fiveWaves, eightWaves, anyWaves, abcd, xabcd |
| Gann | gannBox |

---

## Order Lines

Order lines are horizontal price-level overlays for visualizing open orders, positions, and alerts. The API follows the TradingView `createOrderLine()` pattern with getter/setter pairs and fluent chaining.

### Creating an Order Line

```typescript
import { createOrderLine } from 'superchart'
import type { Chart } from 'superchart'

const chart: Chart = superchart.getChart()!

const orderLine = createOrderLine(chart, {
  price: 49500,
  text: 'Buy 0.5 BTC',
  quantity: '0.5 BTC',
  lineColor: '#4caf50',
  lineStyle: 'dashed',
  bodyBackgroundColor: '#4caf50',
  bodyTextColor: '#FFFFFF',
  editable: true,  // can be dragged to new price (default: true)
})
  .onCancel({ orderId: '123' }, (params) => cancelOrder(params.orderId))
  .onModify({ orderId: '123' }, (params) => modifyOrder(params.orderId))
```

### OrderLine (fluent API)

All setters return `this` for chaining. Getters follow the TradingView `getX()`/`setX()` pattern.

```typescript
export interface OrderLine {
  readonly id: string
  readonly paneId: string

  // Core data
  getPrice(): number | undefined
  setPrice(price: number): OrderLine
  getText(): string | undefined
  setText(text: string): OrderLine
  getQuantity(): number | string | undefined
  setQuantity(quantity: number | string): OrderLine
  getTooltip(): string | undefined
  setTooltip(tooltip: string): OrderLine
  getModifyTooltip(): string | undefined
  setModifyTooltip(tooltip: string): OrderLine
  getCancelTooltip(): string | undefined
  setCancelTooltip(tooltip: string): OrderLine

  // Behavior
  getEditable(): boolean         // default: true
  setEditable(editable: boolean): OrderLine
  getExtendLeft(): boolean
  setExtendLeft(extend: boolean): OrderLine

  // Layout
  setAlign(align: 'left' | 'right'): OrderLine
  setMarginLeft(margin: number): OrderLine
  setMarginRight(margin: number): OrderLine

  // Line styling
  getLineColor(): string | undefined
  setLineColor(color: string): OrderLine
  getLineWidth(): number | undefined
  setLineWidth(width: number): OrderLine
  getLineStyle(): 'solid' | 'dashed' | undefined
  setLineStyle(style: 'solid' | 'dashed'): OrderLine
  setLineDashedValue(dashedValue: number[]): OrderLine
  getLineLength(): number | undefined
  setLineLength(length: number): OrderLine

  // Body label
  getBodyFont(): string | undefined
  setBodyFont(font: string): OrderLine
  setBodyFontWeight(weight: number | string): OrderLine
  getBodyTextColor(): string | undefined
  setBodyTextColor(color: string): OrderLine
  getBodyBackgroundColor(): string | undefined
  setBodyBackgroundColor(color: string): OrderLine
  getBodyBorderColor(): string | undefined
  setBodyBorderColor(color: string): OrderLine

  // Quantity label
  getQuantityFont(): string | undefined
  setQuantityFont(font: string): OrderLine
  setQuantityFontWeight(weight: number | string): OrderLine
  getQuantityTextColor(): string | undefined
  setQuantityTextColor(color: string): OrderLine
  getQuantityBackgroundColor(): string | undefined
  setQuantityBackgroundColor(color: string): OrderLine
  getQuantityBorderColor(): string | undefined
  setQuantityBorderColor(color: string): OrderLine

  // Cancel button
  getCancelButtonIconColor(): string | undefined
  setCancelButtonIconColor(color: string): OrderLine
  getCancelButtonBackgroundColor(): string | undefined
  setCancelButtonBackgroundColor(color: string): OrderLine
  getCancelButtonBorderColor(): string | undefined
  setCancelButtonBorderColor(color: string): OrderLine

  // Shared border
  setBorderStyle(style: 'solid' | 'dashed'): OrderLine
  setBorderSize(size: number): OrderLine
  setBorderRadius(radius: number): OrderLine

  // Visibility
  setBodyVisible(visible: boolean): OrderLine
  setQuantityVisible(visible: boolean): OrderLine
  setCancelButtonVisible(visible: boolean): OrderLine

  // Events (generic T for consumer data)
  onMoveStart<T>(params: T, callback: (params: T, event?) => void): OrderLine
  onMove<T>(params: T, callback: (params: T, event?) => void): OrderLine
  onMoveEnd<T>(params: T, callback: (params: T, event?) => void): OrderLine
  onCancel<T>(params: T, callback: (params: T, event?) => void): OrderLine
  onModify<T>(params: T, callback: (params: T, event?) => void): OrderLine

  // Lifecycle
  getProperties(): OrderLineProperties
  remove(): void
}
```

### Sections

Each order line renders three sections (left to right): **body**, **quantity**, **cancelButton**.

| Section | Interaction | Use case |
|---|---|---|
| body | Draggable (when `editable: true`), click does nothing | Label text (e.g. "Buy 0.5 BTC") |
| quantity | Click calls `onModify` | Size/price display |
| cancelButton | Click calls `onCancel` | X icon to cancel order |

All sections are independently toggle-able via `setBodyVisible()`, `setQuantityVisible()`, and `setCancelButtonVisible()`. Hidden sections leave no gap.

### Alignment

```typescript
// Right-aligned (default) — labels near the y-axis
createOrderLine(chart, { price: 50000, text: 'Limit Buy', align: 'right' })

// Left-aligned — labels at the left edge (e.g. "AVG ENTRY")
createOrderLine(chart, { price: 50000, text: 'AVG ENTRY', align: 'left', marginLeft: 10 })
```

### Price Lines

The overlay draws two dashed lines that skip the label area:
- **price-line-left**: left chart edge → labels start
- **price-line-right**: labels end → right chart edge

This prevents the line from showing through transparent label backgrounds.

### OrderLineProperties

```typescript
export interface OrderLineProperties {
  price?: number
  text?: string
  quantity?: number | string
  tooltip?: string
  modifyTooltip?: string
  cancelTooltip?: string

  // Layout
  align?: 'left' | 'right'
  marginRight?: number
  marginLeft?: number

  // Behavior
  editable?: boolean       // default: true (draggable)
  extendLeft?: boolean

  // Line
  lineColor?: string
  lineWidth?: number
  lineStyle?: 'solid' | 'dashed'
  lineDashedValue?: number[]
  lineLength?: number

  // Body label
  bodyFont?: string
  bodyFontSize?: number
  bodyFontWeight?: number | string
  bodyTextColor?: string
  bodyBackgroundColor?: string
  bodyBorderColor?: string
  bodyPaddingLeft?: number
  bodyPaddingRight?: number
  bodyPaddingTop?: number
  bodyPaddingBottom?: number
  isBodyVisible?: boolean

  // Quantity label
  quantityFont?: string
  quantityFontSize?: number
  quantityFontWeight?: number | string
  quantityTextColor?: string
  quantityBackgroundColor?: string
  quantityBorderColor?: string
  quantityPaddingLeft?: number
  quantityPaddingRight?: number
  quantityPaddingTop?: number
  quantityPaddingBottom?: number
  isQuantityVisible?: boolean

  // Cancel button
  cancelButtonFontSize?: number
  cancelButtonFontWeight?: number | string
  cancelButtonIconColor?: string
  cancelButtonBackgroundColor?: string
  cancelButtonBorderColor?: string
  cancelButtonPaddingLeft?: number
  cancelButtonPaddingRight?: number
  cancelButtonPaddingTop?: number
  cancelButtonPaddingBottom?: number
  isCancelButtonVisible?: boolean

  // Shared border
  borderStyle?: 'solid' | 'dashed'
  borderSize?: number
  borderDashedValue?: number[]
  borderRadius?: number             // default: 0

  // Events
  onMoveStart?: OrderLineEventListener
  onMove?: OrderLineEventListener
  onMoveEnd?: OrderLineEventListener
  onCancel?: OrderLineEventListener
  onModify?: OrderLineEventListener
}

export interface OrderLineEventListener {
  params: unknown
  callback: (params: unknown, event?: OverlayEvent) => void
}
```

---

## Extend Left / Right

Certain line-based overlays can extend their lines to the edges of the chart viewport. This is configured via the overlay settings modal (Style tab → Extend section) or programmatically through `extendData`.

### Supported Overlays

| Overlay | Description |
|---|---|
| `segment` | Line segment extends in one or both directions to the viewport edges |
| `fibonacciSegment` | Fibonacci level lines extend left/right to the viewport edges |
| `fibonacciExtension` | Extension level lines extend left/right to the viewport edges |

### Programmatic Usage

Set `extendData` when creating an overlay:

```typescript
chart.createOverlay({
  name: 'segment',
  points: [
    { timestamp: startTs, value: 48000 },
    { timestamp: endTs, value: 52000 },
  ],
  extendData: { extendLeft: true, extendRight: false },
})
```

Or update an existing overlay via the underlying chart:

```typescript
const klineChart = chart.getChart()
klineChart?.overrideOverlay({
  id: overlayId,
  extendData: { extendLeft: true, extendRight: true },
})
```

The extend state is automatically persisted and restored via `StorageAdapter`.

---

## Timeframe Visibility

Overlays can be configured to show or hide based on the active timeframe. This allows, for example, showing a trend line only on hourly charts and above, or hiding detailed annotations on weekly charts.

### Settings Modal

Double-click an overlay → **Visibility** tab:
- **Show on All Timeframes** — master toggle (default: on)
- Per-category rules — enable/disable each period category (seconds, minutes, hours, days, weeks, months) with from/to range selectors

### How It Works

- Visibility rules are stored per overlay and persisted to `StorageAdapter`
- When the user changes the chart period, all overlays are checked against their visibility rules
- Overlays that don't match the current period are hidden (`visible: false`); matching ones are shown
- Rules are checked as: `period.span >= rule.from && period.span <= rule.to` within each category

### TimeframeVisibility Type

```typescript
export interface TimeframeVisibility {
  showOnAll: boolean
  rules: Record<PeriodCategory, TimeframeVisibilityRule>
}

export interface TimeframeVisibilityRule {
  enabled: boolean
  from: number   // minimum span value
  to: number     // maximum span value
}

export type PeriodCategory = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month'
```

---

## Persistence — SavedOverlay

Overlays are automatically saved to `StorageAdapter` when a `storageKey` and adapter are configured. Each overlay is serialized as:

```typescript
export interface SavedOverlay {
  id: string
  /** Overlay type name (e.g. 'fibonacciLine') */
  name: string
  /** Pane ID where the overlay lives */
  paneId: string
  groupId?: string
  /** Anchor points stored as timestamp+value pairs */
  points: SavedOverlayPoint[]
  properties?: DeepPartial<OverlayProperties>
  lock: boolean
  visible: boolean
  extendLeft?: boolean
  extendRight?: boolean
  mode?: OverlayMode
  extendData?: unknown
  /** Timeframe visibility rules (omitted when showOnAll is true) */
  timeframeVisibility?: TimeframeVisibility
}

export interface SavedOverlayPoint {
  /** Unix milliseconds */
  timestamp: number
  /** Price value */
  value: number
}
```

Points are stored as `{ timestamp, value }` rather than `{ dataIndex, value }` to survive gaps when new bars are added to the left.

### overlayPointsToSaved

Helper to convert klinecharts `Point[]` to `SavedOverlayPoint[]`:

```typescript
function overlayPointsToSaved(points: Array<Partial<Point>>): SavedOverlayPoint[]
```

Used internally when serializing overlays. Only points with both `timestamp` and `value` defined are included.

---

## ProOverlay

`ProOverlay` is an extended overlay interface that adds property management methods. Created by `ProOverlayTemplate` factories registered in klinecharts:

```typescript
export interface ProOverlay extends Overlay {
  setProperties(properties: DeepPartial<OverlayProperties>, id: string): void
  getProperties(id: string): DeepPartial<OverlayProperties>
}

export interface ProOverlayCreate extends OverlayCreate {
  properties?: DeepPartial<OverlayProperties>
}
```

`createOverlay` accepts `ProOverlayCreate`, so you can set initial properties directly:

```typescript
chart.createOverlay({
  name: 'fibonacciLine',
  points: [
    { timestamp: highTs, value: 55000 },
    { timestamp: lowTs, value: 40000 },
  ],
  properties: {
    line: { color: '#9C27B0' },
  },
})
```
