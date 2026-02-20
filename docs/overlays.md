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

Order lines are horizontal price-level overlays designed specifically for visualizing open orders.

```typescript
// Re-exported from klinecharts
function createOrderLine(chart: Chart, price: number, properties?: DeepPartial<OrderLineProperties>): OrderLine
```

```typescript
const chart = new Superchart({ ... })
const klineChart = chart.getChart()

if (klineChart) {
  const orderLine = createOrderLine(klineChart, 49500, {
    line: { color: '#F57F17', style: 'dashed', size: 1 },
    // ...
  })
}
```

### OrderLine

The object returned by `createOrderLine`. Provides methods for updating and removing the line:

```typescript
export interface OrderLine {
  setPrice(price: number): void
  setVisible(visible: boolean): void
  setProperties(properties: DeepPartial<OrderLineProperties>): void
  dispose(): void
  onMouseEnter(listener: OrderLineEventListener): void
  onMouseLeave(listener: OrderLineEventListener): void
  onClick(listener: OrderLineEventListener): void
  onRightClick(listener: OrderLineEventListener): void
}

export type OrderLineEventListener = (orderLine: OrderLine, event: MouseEvent) => void
```

### OrderLineProperties

```typescript
export interface OrderLineProperties {
  line: OrderLineStyle
  text: {
    color: string
    paddingLeft: number
    paddingRight: number
    paddingTop: number
    paddingBottom: number
    borderRadius: number
    backgroundColor: string
    content: string
  }
}

export interface OrderLineStyle {
  color: string
  style: 'solid' | 'dashed' | 'dotted'
  size: number
}
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
