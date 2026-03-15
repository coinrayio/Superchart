# Indicator Database

The server uses a SQLite database (`tempstore.db` in the server root, adjacent to `src/`) to store preset indicator scripts and their display metadata. Access is synchronous via `better-sqlite3`.

---

## Schema

```sql
CREATE TABLE IF NOT EXISTS indicators (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  short_name    TEXT NOT NULL,
  description   TEXT,
  category      TEXT NOT NULL DEFAULT 'custom',
  pane_id       TEXT NOT NULL DEFAULT 'sub',
  is_overlay    INTEGER NOT NULL DEFAULT 0,
  is_new        INTEGER NOT NULL DEFAULT 0,
  is_updated    INTEGER NOT NULL DEFAULT 0,
  default_settings TEXT NOT NULL DEFAULT '{}',
  code          TEXT NOT NULL
);
```

---

## Column Reference

| Column | Type | Description |
|---|---|---|
| `id` | TEXT (PK) | Stable identifier used internally (e.g., `'tdi'`, `'stochastic'`). Lowercase, no spaces. |
| `name` | TEXT UNIQUE | Display name shown in the indicator modal and used as the key for `executePreset` / `getIndicatorCode` requests. Must match exactly what the client sends as `indicatorName`. |
| `short_name` | TEXT | Abbreviated label shown on the chart pane header (e.g., `'Stoch'`, `'BB'`). |
| `description` | TEXT | Optional human-readable description shown in the indicator browser. |
| `category` | TEXT | Groups indicators in the UI. See valid values below. |
| `pane_id` | TEXT | Determines which chart pane the indicator renders in. See valid values below. |
| `is_overlay` | INTEGER | `1` if the indicator overlays the price chart; `0` for a separate sub-pane. Must be consistent with `pane_id`. |
| `is_new` | INTEGER | `1` to show a "New" badge in the indicator modal. Set to `0` once users have seen it. |
| `is_updated` | INTEGER | `1` to show an "Updated" badge in the indicator modal. |
| `default_settings` | TEXT | JSON-encoded `Record<string, SettingValue>` of default input values. Must be valid JSON; use `'{}'` for no settings. |
| `code` | TEXT | Full Pine Script source code. Versions v4, v5, and v6 are supported. |

---

## `category` Values

| Value | Typical use |
|---|---|
| `'trend'` | Trend-following indicators (ADX, Ichimoku, etc.) |
| `'oscillator'` | Bounded oscillators (RSI, Stochastic, CCI) |
| `'momentum'` | Momentum-based indicators (MACD, ROC) |
| `'volume'` | Volume-based indicators (OBV, MFI) |
| `'volatility'` | Volatility bands and ranges (Bollinger Bands, ATR) |
| `'moving_average'` | Moving average indicators (SMA, EMA crossovers) |
| `'custom'` | Default. User-defined or multi-purpose indicators (TDI, etc.) |

The category value is passed as-is to the client via `listIndicators` and is used by the UI to group indicators in the browser modal. Adding a new category string is sufficient to create a new group — no other changes are needed.

---

## `pane_id` Values

| Value | Meaning |
|---|---|
| `'candle_pane'` | Renders overlaid on the main OHLC candlestick pane. Use when `is_overlay = 1`. |
| Any unique string | Creates a dedicated sub-pane below the main chart. Examples: `'sub'`, `'rsi_pane'`, `'macd_pane'`. |

If two indicators share the same `pane_id`, they render in the same sub-pane (their series are layered). Use distinct IDs to separate them.

---

## Auto-Seeding

The database is created automatically at server startup. If the `indicators` table is empty (first run or after a fresh database), the server seeds it with 6 preset indicators via a single transaction. The database file is `tempstore.db` next to `src/`.

### Seeded Presets

| `id` | `name` | Category | Overlay | Pine version |
|---|---|---|---|---|
| `tdi` | TDI | custom | No | v4 |
| `stochastic` | Stochastic | oscillator | No | v6 |
| `rsi_simple` | Simple RSI | oscillator | No | v5 |
| `macd_simple` | MACD | momentum | No | v5 |
| `ma_crossover` | Moving Averages | moving_average | Yes | v5 |
| `bollinger` | Bollinger Bands | volatility | Yes | v5 |

---

## `db.ts` API

The module exports two functions:

```typescript
import { getAllIndicators, getIndicatorByName } from './db.js'
import type { DbIndicator } from './db.js'

interface DbIndicator {
  id: string
  name: string
  short_name: string
  description: string | null
  category: string
  pane_id: string
  is_overlay: number   // 0 or 1 (SQLite has no boolean)
  is_new: number
  is_updated: number
  default_settings: string  // JSON string
  code: string
}

// Returns all indicators sorted by category, then name
getAllIndicators(): DbIndicator[]

// Returns a single indicator by exact name match, or undefined
getIndicatorByName(name: string): DbIndicator | undefined
```

---

## Adding a New Preset Indicator

### Option 1: Add to the seed array in `db.ts` (recommended for permanent presets)

This approach bundles the indicator with the server code. It is inserted on first startup when the table is empty.

In `src/db.ts`, add an entry to the `seedMany([...])` array:

```typescript
{
  id: 'my_atr_bands',
  name: 'ATR Bands',
  short_name: 'ATR',
  description: 'Average True Range Bands for dynamic support/resistance',
  category: 'volatility',
  pane_id: 'candle_pane',
  is_overlay: 1,
  is_new: 1,
  is_updated: 0,
  default_settings: JSON.stringify({ period: 14, multiplier: 2.0 }),
  code: `//@version=6
indicator("ATR Bands", overlay=true)
period = input.int(14, title="ATR Period")
mult   = input.float(2.0, title="Multiplier")
atrVal = ta.atr(period)
plot(ta.sma(close, period) + mult * atrVal, title="Upper", color=color.red)
plot(ta.sma(close, period) - mult * atrVal, title="Lower", color=color.green)`,
}
```

Then delete `tempstore.db` and restart the server so the seed runs again. Or insert directly via Option 2 to avoid losing existing data.

### Option 2: Direct SQLite insert at runtime (survives restarts)

Use this when the server is already running and you do not want to drop the database:

```typescript
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const db = new Database(join(__dirname, '..', 'tempstore.db'))

db.prepare(`
  INSERT INTO indicators
    (id, name, short_name, description, category, pane_id, is_overlay, is_new, is_updated, default_settings, code)
  VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  'my_atr_bands',
  'ATR Bands',
  'ATR',
  'Average True Range Bands',
  'volatility',
  'candle_pane',
  1,    // is_overlay
  1,    // is_new
  0,    // is_updated
  JSON.stringify({ period: 14, multiplier: 2.0 }),
  `//@version=6\nindicator("ATR Bands", overlay=true)\n...`
)
```

---

## Removing or Updating an Indicator

```typescript
import Database from 'better-sqlite3'
const db = new Database('tempstore.db')

// Delete a preset indicator permanently
db.prepare(`DELETE FROM indicators WHERE name = ?`).run('Old Indicator')

// Update the Pine Script source of an existing indicator
// Set is_updated=1 to show the "Updated" badge in the client UI
db.prepare(`
  UPDATE indicators SET code = ?, is_updated = 1, is_new = 0 WHERE name = ?
`).run(newPineScriptSource, 'Stochastic')

// Update default settings
db.prepare(`
  UPDATE indicators SET default_settings = ? WHERE name = ?
`).run(JSON.stringify({ periodK: 21, smoothK: 3, periodD: 3 }), 'Stochastic')
```

---

## Managing `is_new` and `is_updated` Badges

Both flags are integer columns (`0` or `1`). They control badge display in the indicator browser:

- `is_new = 1` → shows a "New" badge next to the indicator name.
- `is_updated = 1` → shows an "Updated" badge.

To clear badges after a release or after users have acknowledged the changes:

```typescript
// Clear all badges
db.prepare(`UPDATE indicators SET is_new = 0, is_updated = 0`).run()

// Clear badge for a specific indicator
db.prepare(`UPDATE indicators SET is_new = 0 WHERE name = ?`).run('Stochastic')
```

Badge state is global — all connected clients see the same state. There is no per-user badge tracking in the current implementation.
