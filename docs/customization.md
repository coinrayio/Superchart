# Customization

---

## Themes

Superchart ships with `'light'` and `'dark'` built-in themes. The `theme` option sets the initial theme; `setTheme()` changes it at runtime.

```typescript
// Initial theme
const chart = new Superchart({
  theme: 'dark',
  // ...
})

// Runtime switch
chart.setTheme('light')
chart.getTheme() // 'light'
```

Custom theme names are supported. Register a custom theme by calling klinecharts `registerStyles` with the custom name, then pass the same name as the `theme` option.

---

## Style Overrides

For fine-grained control, pass `styleOverrides: DeepPartial<PaneProperties>` to override specific canvas properties without replacing the entire theme.

`PaneProperties` extends the klinecharts `Styles` interface with gradient background fields:

```typescript
export interface PaneProperties extends Styles {
  backgroundType: 'solid' | 'gradient'
  background: string
  backgroundGradientStartColor: string
  backgroundGradientEndColor: string
}
```

`Styles` is the full klinecharts style tree. Common sub-trees:

| Path | Description |
|---|---|
| `candle` | Candle body, wick, border colors; Heikin-Ashi variations |
| `candle.bar` | OHLC bar rendering |
| `candle.area` | Area chart fill color and line |
| `indicator` | Colors for built-in klinecharts indicators |
| `crosshair` | Crosshair line color, style, label |
| `grid` | Grid line horizontal/vertical color and style |
| `xAxis` | X-axis label font, color, tick size |
| `yAxis` | Y-axis label font, color, tick size, min/max fractions |
| `separator` | Pane divider line |
| `overlay` | Overlay default colors and sizes |

```typescript
const chart = new Superchart({
  styleOverrides: {
    background: '#0D0D0D',
    grid: {
      horizontal: { color: '#1A1A1A' },
      vertical:   { color: '#1A1A1A' },
    },
    candle: {
      upColor:   '#00C853',
      downColor: '#D50000',
      noChangeColor: '#888888',
    },
    crosshair: {
      horizontal: { line: { color: '#666666' } },
      vertical:   { line: { color: '#666666' } },
    },
  },
  // ...
})
```

Apply overrides at runtime:

```typescript
chart.setStyles({
  candle: { upColor: '#4CAF50', downColor: '#F44336' },
})
```

---

## Locale

Set the UI locale via the `locale` option (BCP-47 tag). The locale affects all UI labels: toolbar buttons, indicator names, settings modal, period names, drawing tool names.

```typescript
const chart = new Superchart({
  locale: 'zh-CN',
  // ...
})

// Change at runtime
chart.setLocale('ja-JP')
chart.getLocale() // 'ja-JP'
```

### Built-in Locales

| Code | Language |
|---|---|
| `en-US` | English (United States) — default |
| `zh-CN` | Chinese (Simplified) |
| `zh-TW` | Chinese (Traditional) |
| `ja-JP` | Japanese |
| `ko-KR` | Korean |
| `ar-AE` | Arabic |
| `ru-RU` | Russian |
| `vi-VN` | Vietnamese |
| `ms-MY` | Malay |
| `es-ES` | Spanish |

### Custom Locale

Register a custom locale with `loadLocale()`:

```typescript
import { loadLocale } from 'superchart'

loadLocale('de-DE', {
  'drawing.trendline': 'Trendlinie',
  'drawing.fibonacci': 'Fibonacci',
  'indicator.add': 'Indikator hinzufügen',
  'period.1m': '1 Min',
  'period.1h': '1 Std',
  // ...
})
```

After registering, pass `'de-DE'` as the `locale` option or call `setLocale('de-DE')`.

---

## Timezone

All timestamps on the x-axis and in tooltips are displayed in the configured timezone.

```typescript
const chart = new Superchart({
  timezone: 'America/New_York',
  // ...
})

chart.setTimezone('Europe/London')
chart.getTimezone() // 'Europe/London'
```

Accepts any IANA timezone identifier (e.g. `'UTC'`, `'America/Chicago'`, `'Asia/Tokyo'`, `'Europe/Berlin'`). Default is `'Etc/UTC'`.

### translateTimezone

A helper that converts a TradingView timezone string to an IANA identifier (for use when your Datafeed returns TradingView-style timezone strings):

```typescript
import { translateTimezone } from 'superchart'

translateTimezone('America/New_York') // 'America/New_York'
translateTimezone('UTC')              // 'Etc/UTC'
translateTimezone('Etc/UTC')          // 'Etc/UTC'
```

---

## Periods

The `periods` option controls which timeframes appear in the period selector toolbar. Defaults to a standard set of 9 periods.

```typescript
import { PERIODS } from 'superchart'

const chart = new Superchart({
  periods: [
    PERIODS['1m'],
    PERIODS['5m'],
    PERIODS['15m'],
    PERIODS['1h'],
    PERIODS['4h'],
    PERIODS['1D'],
  ],
  // ...
})
```

You can define completely custom periods:

```typescript
const chart = new Superchart({
  periods: [
    { type: 'minute', span: 2,  text: '2m'  },
    { type: 'minute', span: 7,  text: '7m'  },
    { type: 'hour',   span: 3,  text: '3H'  },
    { type: 'day',    span: 2,  text: '2D'  },
  ],
  // ...
})
```

---

## Watermark

The `watermark` option overlays text or a DOM node on the chart canvas. Use it for exchange logos, copyright notices, or branding.

```typescript
// Simple text
const chart = new Superchart({
  watermark: 'EXCHANGE — BTCUSDT',
  // ...
})

// HTML string rendered as a node
const chart = new Superchart({
  watermark: '<span style="font-size:24px;opacity:0.15">POWERED BY SUPERCHART</span>',
  // ...
})

// DOM element (e.g. an img)
const logo = document.createElement('img')
logo.src = '/logo.svg'
logo.style.opacity = '0.1'
logo.style.width = '200px'

const chart = new Superchart({
  watermark: logo,
  // ...
})
```

---

## Period Bar API

The period bar toolbar is extensible with custom buttons and dropdowns. Items are plain `HTMLElement`s — you can set `innerHTML`, add event listeners, or apply classes freely without touching React.

### `chart.createButton(options?)`

Adds a button to the toolbar and returns the `HTMLElement`. The element is pre-styled to match the built-in toolbar buttons.

```typescript
// Simple click handler
const alertBtn = chart.createButton({
  text: 'Alert',
  tooltip: 'Set price alert',
  onClick: () => openAlertDialog(),
})

// SVG icon (no text label)
const refreshBtn = chart.createButton({
  icon: '<svg viewBox="0 0 20 20" width="16" height="16"><path d="M10 2a8 8 0 100 16A8 8 0 0010 2z" fill="currentColor"/></svg>',
  tooltip: 'Refresh data',
  onClick: () => reloadData(),
})

// Place on the left side (after period selector)
const leftBtn = chart.createButton({
  align: 'left',
  text: 'Draw',
  onClick: () => activateDrawingMode(),
})

// Returned element can be customised further
const btn = chart.createButton({ text: 'Custom' })
btn.style.color = '#F5A623'
btn.setAttribute('data-testid', 'my-button')
```

**Options:**

| Field | Type | Default | Description |
|---|---|---|---|
| `align` | `'left' \| 'right'` | `'right'` | `'left'` = after period selector; `'right'` = before fullscreen |
| `text` | `string` | — | Visible text label |
| `icon` | `string` | — | SVG markup or HTML rendered before the label |
| `tooltip` | `string` | — | Native tooltip on hover |
| `onClick` | `() => void` | — | Click handler |

---

### `chart.createDropdown(options)`

Adds a dropdown trigger button to the toolbar and returns the trigger `HTMLElement`. The dropdown list is a self-contained pure-DOM widget — no React required.

```typescript
chart.createDropdown({
  text: 'Chart Type',
  tooltip: 'Change chart style',
  items: [
    {
      text: 'Candlestick',
      icon: '<svg>...</svg>',
      onClick: () => chart.getChart()?.setStyles({ candle: { type: 'candle_solid' } }),
    },
    {
      text: 'Line',
      onClick: () => chart.getChart()?.setStyles({ candle: { type: 'area' } }),
    },
    { type: 'separator' },
    {
      text: 'Heikin-Ashi',
      onClick: () => chart.getChart()?.setStyles({ candle: { type: 'candle_solid' } }),
    },
  ],
})
```

**Options:**

| Field | Type | Default | Description |
|---|---|---|---|
| `align` | `'left' \| 'right'` | `'right'` | Same as `createButton` |
| `text` | `string` | — | Text label on the trigger |
| `icon` | `string` | — | SVG/HTML icon on the trigger |
| `tooltip` | `string` | — | Native tooltip |
| `items` | `ToolbarDropdownItem[]` | required | List of items or separators |

**`ToolbarDropdownItem`** is a union:

```typescript
// Regular clickable item
{ type?: 'item'; text: string; icon?: string; onClick: () => void }

// Visual separator line
{ type: 'separator' }
```

---

## CSS Classes

Target Superchart DOM elements for custom styling:

| Class | Element |
|---|---|
| `.superchart` | Root wrapper div |
| `.superchart-period-bar` | Period selector toolbar |
| `.superchart-drawing-bar` | Drawing tools sidebar |
| `.superchart-chart-widget` | Canvas wrapper |
| `.superchart-loading` | Loading overlay |
| `.superchart-indicator-modal` | Indicator picker modal |
| `.superchart-script-editor` | Script editor panel |
| `.superchart-tooltip` | Indicator tooltip (OHLCV + values on hover) |

Example — custom font for the period bar:

```css
.superchart-period-bar {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
}

/* Active period button */
.superchart-period-bar .period-button.active {
  color: #2196F3;
  border-bottom: 2px solid #2196F3;
}
```

Superchart mounts inside `container` and adds `class="superchart"` to the root element, so all CSS selectors above can be scoped under your container if needed:

```css
#my-chart-container .superchart-period-bar { ... }
```

---

## Screenshot

Capture the current chart canvas as a data URL:

```typescript
// PNG with transparent background
const pngUrl = chart.getScreenshotUrl('png')

// JPEG with custom background (useful for dark themes)
const jpgUrl = chart.getScreenshotUrl('jpeg', '#0D0D0D')

// Download
const link = document.createElement('a')
link.href = pngUrl
link.download = 'chart.png'
link.click()
```
