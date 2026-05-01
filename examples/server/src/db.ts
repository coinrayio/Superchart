/**
 * SQLite database for storing preset indicator scripts.
 * Uses better-sqlite3 (synchronous API).
 */

import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, '..', 'tempstore.db')

export interface DbIndicator {
  id: string
  name: string
  short_name: string
  description: string | null
  category: string
  pane_id: string
  is_overlay: number
  is_new: number
  is_updated: number
  default_settings: string
  code: string
}

const db = new Database(DB_PATH)

db.exec(`
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
  )
`)

// Seed data — only inserted if table is empty
const countRow = db.prepare('SELECT COUNT(*) as cnt FROM indicators').get() as { cnt: number }

if (countRow.cnt === 0) {
  const insert = db.prepare(`
    INSERT INTO indicators (id, name, short_name, description, category, pane_id, is_overlay, is_new, is_updated, default_settings, code)
    VALUES (@id, @name, @short_name, @description, @category, @pane_id, @is_overlay, @is_new, @is_updated, @default_settings, @code)
  `)

  const seedMany = db.transaction((rows: Omit<DbIndicator, never>[]) => {
    for (const row of rows) {
      insert.run(row)
    }
  })

  seedMany([
    {
      id: 'tdi',
      name: 'TDI',
      short_name: 'TDI',
      description: 'Traders Dynamic Index + RSI Divergences + Buy/Sell Signals',
      category: 'custom',
      pane_id: 'sub',
      is_overlay: 0,
      is_new: 1,
      is_updated: 0,
      default_settings: '{}',
      code: `//@version=4
// Credits to LazyBear and JustUncleL.. more features added by ZyadaCharts


study("TDI - Traders Dynamic Index + RSI Divergences + Buy/Sell Signals", shorttitle="TDI + RSI Div")

rsiPeriod = input(14, minval = 1, title = "RSI Period")
bandLength = input(34, minval = 1, title = "Band Length")
lengthrsipl = input(7, minval = 0, title = "Fast MA on RSI")
lengthtradesl = input(2, minval = 1, title = "Slow MA on RSI")

src1 = close                                                             // Source of Calculations (Close of Bar)
r = rsi(src1, rsiPeriod)                                                 // RSI of Close
ma = sma(r, bandLength)                                                 // Moving Average of RSI [current]
offs = (1.6185 * stdev(r, bandLength))                                  // Offset
up = ma + offs                                                          // Upper Bands
dn = ma - offs                                                          // Lower Bands
mid = (up + dn) / 2                                                     // Average of Upper and Lower Bands
mbb = sma(r, lengthrsipl)                                            // Moving Average of RSI 2 bars back
mab = sma(r, lengthtradesl)                                          // Moving Average of RSI 7 bars back


hline(30, color=color.red, linewidth=1, linestyle=hline.style_dotted)
hline(50, color=color.orange, linewidth=1, linestyle=hline.style_dotted)
hline(70, color=color.green, linewidth=1, linestyle=hline.style_dotted)

// Plot the TDI
upl=plot(up, color=#12bcc9, transp=60, title="VB Channel High",linewidth=2)
dnl=plot(dn, color=#12bcc9, transp=60, title="VB Channel Low",linewidth=2)
midl=plot(mid, color=color.orange, transp=40, linewidth=2, title="MBL")
mabl=plot(mab, color=color.lime, transp=30, linewidth=2, title="RSI PL")
mbbl=plot(mbb, color=color.red, transp=60, linewidth=2, title="TSL Signal")

//
//create RSI TSL cloud to indicate trend direction.
fill(mabl,mbbl, color=mab>mbb?color.green:color.red,transp=80)

//long/short labels

long1= crossover(mab, mbb) and mbb > mid and mbb > 50
short1= crossunder(mab, mbb) and mbb < mid and mbb < 50

plotshape(long1, style=shape.labelup, location=location.bottom, color=color.lime, size=size.tiny, editable=true)
plotshape(short1, style=shape.labeldown, location=location.top, color=color.red, size=size.tiny, editable=true)

alertcondition(long1, title='Long', message='Crossover')
alertcondition(short1, title='Short', message='Crossunder')

best_setup = crossover(mab, mid)
alertcondition(best_setup, title="RSI Crosses Yellow", message="rsi crosses mid")

scalp= mab > mid
bgcolor(scalp ? color.lime : na, transp=95)

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////



// Divergences //


len = input(title="RSI Period", minval=1, defval=14)
src = input(title="RSI Source", defval=close)
lbR = input(title="Pivot Lookback Right", defval=5)
lbL = input(title="Pivot Lookback Left", defval=5)
rangeUpper = input(title="Max of Lookback Range", defval=60)
rangeLower = input(title="Min of Lookback Range", defval=5)
plotBull = input(title="Plot Bullish", defval=true)
plotHiddenBull = input(title="Plot Hidden Bullish", defval=false)
plotBear = input(title="Plot Bearish", defval=true)
plotHiddenBear = input(title="Plot Hidden Bearish", defval=false)
bearColor = color.red
bullColor = color.green
hiddenBullColor = color.new(color.green, 80)
hiddenBearColor = color.new(color.red, 80)
textColor = color.white
noneColor = color.new(color.white, 100)
osc = rsi(src, len)

plFound = na(pivotlow(osc, lbL, lbR)) ? false : true
phFound = na(pivothigh(osc, lbL, lbR)) ? false : true
_inRange(cond) =>
\tbars = barssince(cond == true)
\trangeLower <= bars and bars <= rangeUpper


//------------------------------------------------------------------------------
// Regular Bullish
// Osc: Higher Low

oscHL = osc[lbR] > valuewhen(plFound, osc[lbR], 1) and _inRange(plFound[1])

// Price: Lower Low

priceLL = low[lbR] < valuewhen(plFound, low[lbR], 1)
bullCond = plotBull and priceLL and oscHL and plFound

plot(
     plFound ? osc[lbR] : na,
     offset=-lbR,
     title="Regular Bullish",
     linewidth=2,
     color=(bullCond ? bullColor : noneColor),
     transp=0
     )

plotshape(
\t bullCond ? osc[lbR] : na,
\t offset=-lbR,
\t title="Regular Bullish Label",
\t text=" Bull ",
\t style=shape.labelup,
\t location=location.absolute,
\t color=bullColor,
\t textcolor=textColor,
\t transp=0
\t )

//------------------------------------------------------------------------------
// Hidden Bullish
// Osc: Lower Low

oscLL = osc[lbR] < valuewhen(plFound, osc[lbR], 1) and _inRange(plFound[1])

// Price: Higher Low

priceHL = low[lbR] > valuewhen(plFound, low[lbR], 1)
hiddenBullCond = plotHiddenBull and priceHL and oscLL and plFound

plot(
\t plFound ? osc[lbR] : na,
\t offset=-lbR,
\t title="Hidden Bullish",
\t linewidth=2,
\t color=(hiddenBullCond ? hiddenBullColor : noneColor),
\t transp=0
\t )

plotshape(
\t hiddenBullCond ? osc[lbR] : na,
\t offset=-lbR,
\t title="Hidden Bullish Label",
\t text=" H Bull ",
\t style=shape.labelup,
\t location=location.absolute,
\t color=bullColor,
\t textcolor=textColor,
\t transp=0
\t )

//------------------------------------------------------------------------------
// Regular Bearish
// Osc: Lower High

oscLH = osc[lbR] < valuewhen(phFound, osc[lbR], 1) and _inRange(phFound[1])

// Price: Higher High

priceHH = high[lbR] > valuewhen(phFound, high[lbR], 1)

bearCond = plotBear and priceHH and oscLH and phFound

plot(
\t phFound ? osc[lbR] : na,
\t offset=-lbR,
\t title="Regular Bearish",
\t linewidth=2,
\t color=(bearCond ? bearColor : noneColor),
\t transp=0
\t )

plotshape(
\t bearCond ? osc[lbR] : na,
\t offset=-lbR,
\t title="Regular Bearish Label",
\t text=" Bear ",
\t style=shape.labeldown,
\t location=location.absolute,
\t color=bearColor,
\t textcolor=textColor,
\t transp=0
\t )

//------------------------------------------------------------------------------
// Hidden Bearish
// Osc: Higher High

oscHH = osc[lbR] > valuewhen(phFound, osc[lbR], 1) and _inRange(phFound[1])

// Price: Lower High

priceLH = high[lbR] < valuewhen(phFound, high[lbR], 1)

hiddenBearCond = plotHiddenBear and priceLH and oscHH and phFound

plot(
\t phFound ? osc[lbR] : na,
\t offset=-lbR,
\t title="Hidden Bearish",
\t linewidth=2,
\t color=(hiddenBearCond ? hiddenBearColor : noneColor),
\t transp=0
\t )

plotshape(
\t hiddenBearCond ? osc[lbR] : na,
\t offset=-lbR,
\t title="Hidden Bearish Label",
\t text=" H Bear ",
\t style=shape.labeldown,
\t location=location.absolute,
\t color=bearColor,
\t textcolor=textColor,
\t transp=0
\t )`,
    },
    {
      id: 'stochastic',
      name: 'Stochastic',
      short_name: 'Stoch',
      description: 'Stochastic oscillator with %K and %D lines',
      category: 'oscillator',
      pane_id: 'sub',
      is_overlay: 0,
      is_new: 1,
      is_updated: 0,
      default_settings: '{"periodK":14,"smoothK":1,"periodD":3}',
      code: `//@version=6
indicator(title="Stochastic", shorttitle="Stoch", format=format.price, precision=2, timeframe="", timeframe_gaps=true)
periodK = input.int(14, title="%K Length", minval=1)
smoothK = input.int(1, title="%K Smoothing", minval=1)
periodD = input.int(3, title="%D Smoothing", minval=1)
k = ta.sma(ta.stoch(close, high, low, periodK), smoothK)
d = ta.sma(k, periodD)
plot(k, title="%K", color=#2962FF)
plot(d, title="%D", color=#FF6D00)
h0 = hline(80, "Upper Band", color=#787B86)
hline(50, "Middle Band", color=color.new(#787B86, 50))
h1 = hline(20, "Lower Band", color=#787B86)
fill(h0, h1, color=color.rgb(33, 150, 243, 90), title="Background")`,
    },
    {
      id: 'rsi_simple',
      name: 'Simple RSI',
      short_name: 'RSI',
      description: 'RSI indicator with overbought/oversold levels',
      category: 'oscillator',
      pane_id: 'sub',
      is_overlay: 0,
      is_new: 0,
      is_updated: 0,
      default_settings: '{"length":14}',
      code: `//@version=5
indicator("My RSI", overlay=false)

length = input(14, title="RSI Length")
rsiValue = rsi(close, length)

plot(rsiValue, title="RSI", color=color.purple)
hline(70, title="Overbought", color=color.red, linestyle=dashed)
hline(50, title="Midline", color=color.gray, linestyle=dotted)
hline(30, title="Oversold", color=color.green, linestyle=dashed)`,
    },
    {
      id: 'macd_simple',
      name: 'MACD',
      short_name: 'MACD',
      description: 'MACD indicator with histogram',
      category: 'momentum',
      pane_id: 'sub',
      is_overlay: 0,
      is_new: 0,
      is_updated: 0,
      default_settings: '{"fastLength":12,"slowLength":26,"signalLength":9}',
      code: `//@version=5
indicator("My MACD", overlay=false)

fastLength = input(12, title="Fast Length")
slowLength = input(26, title="Slow Length")
signalLength = input(9, title="Signal Length")

result = macd(close, fastLength, slowLength, signalLength)
macdLine = result.macd
signalLine = result.signal

plot(macdLine, title="MACD", color=color.blue)
plot(signalLine, title="Signal", color=color.orange)
hline(0, title="Zero", color=color.gray)`,
    },
    {
      id: 'ma_crossover',
      name: 'Moving Averages',
      short_name: 'MA Cross',
      description: 'SMA and EMA crossover system',
      category: 'moving_average',
      pane_id: 'candle_pane',
      is_overlay: 1,
      is_new: 0,
      is_updated: 0,
      default_settings: '{"smaLength":20,"emaLength":50}',
      code: `//@version=5
indicator("Moving Averages", overlay=true)

smaLength = input(20, title="SMA Length")
emaLength = input(50, title="EMA Length")

smaValue = sma(close, smaLength)
emaValue = ema(close, emaLength)

plot(smaValue, title="SMA", color=color.blue)
plot(emaValue, title="EMA", color=color.orange)`,
    },
    {
      id: 'bollinger',
      name: 'Bollinger Bands',
      short_name: 'BB',
      description: 'Bollinger Bands with standard deviation',
      category: 'volatility',
      pane_id: 'candle_pane',
      is_overlay: 1,
      is_new: 0,
      is_updated: 0,
      default_settings: '{"length":20,"mult":2.0}',
      code: `//@version=5
indicator("Bollinger Bands", overlay=true)

length = input(20, title="Length")
mult = input(2.0, title="StdDev")

result = bb(close, length, mult)
upper = result.upper
middle = result.middle
lower = result.lower

plot(upper, title="Upper Band", color=color.red)
plot(middle, title="Middle Band", color=color.blue)
plot(lower, title="Lower Band", color=color.green)`,
    },
  ])

  console.log('✅ Database seeded with 6 preset indicators')
}

export function getAllIndicators(): DbIndicator[] {
  return db.prepare('SELECT * FROM indicators ORDER BY category, name').all() as DbIndicator[]
}

export function getIndicatorByName(name: string): DbIndicator | undefined {
  return db.prepare('SELECT * FROM indicators WHERE name = ?').get(name) as DbIndicator | undefined
}

// ----------------------------------------------------------------------------
// Chart state — per-key blobs with optimistic-concurrency revision.
// Mirrors Superchart's StorageAdapter contract; see PERSISTENCE_ROADMAP.md.
// ----------------------------------------------------------------------------

db.exec(`
  CREATE TABLE IF NOT EXISTS chart_state (
    key        TEXT PRIMARY KEY,
    state      TEXT NOT NULL,
    revision   INTEGER NOT NULL,
    updated_at TEXT NOT NULL,
    symbol     TEXT,
    period     TEXT
  )
`)

interface ChartStateRow {
  key: string
  state: string
  revision: number
  updated_at: string
  symbol: string | null
  period: string | null
}

export interface ChartStateRecord {
  state: unknown
  revision: number
}

export interface ChartStateEntry {
  key: string
  revision: number
  savedAt: number
  symbol?: string
  period?: string
}

export function loadChartState(key: string): ChartStateRecord | null {
  const row = db.prepare('SELECT state, revision FROM chart_state WHERE key = ?').get(key) as
    | { state: string; revision: number }
    | undefined
  if (!row) return null
  return { state: JSON.parse(row.state), revision: row.revision }
}

/**
 * Save chart state with optional optimistic-concurrency check.
 *
 * Returns:
 *   { ok: true, revision }                     on success
 *   { ok: false, conflict: true, current }     when expectedRevision is stale
 */
export function saveChartState(
  key: string,
  state: unknown,
  expectedRevision: number | undefined,
  symbol?: string,
  period?: string
):
  | { ok: true; revision: number }
  | { ok: false; conflict: true; current: ChartStateRecord } {
  const current = db.prepare('SELECT state, revision FROM chart_state WHERE key = ?').get(key) as
    | { state: string; revision: number }
    | undefined
  const currentRevision = current?.revision ?? 0

  if (expectedRevision !== undefined && currentRevision !== expectedRevision) {
    return {
      ok: false,
      conflict: true,
      current: {
        state: current ? JSON.parse(current.state) : state,
        revision: currentRevision,
      },
    }
  }

  const nextRevision = currentRevision + 1
  const updatedAt = new Date().toISOString()
  const stateJson = JSON.stringify(state)

  if (current) {
    // Affected-row check guards against a concurrent writer that bumped revision
    // between our SELECT and UPDATE. better-sqlite3 is synchronous so this is
    // unlikely under normal load, but cheap insurance.
    const result = db
      .prepare('UPDATE chart_state SET state = ?, revision = ?, updated_at = ?, symbol = ?, period = ? WHERE key = ? AND revision = ?')
      .run(stateJson, nextRevision, updatedAt, symbol ?? null, period ?? null, key, currentRevision)
    if (result.changes !== 1) {
      // Race: someone else wrote between SELECT and UPDATE. Surface as conflict.
      const fresh = db.prepare('SELECT state, revision FROM chart_state WHERE key = ?').get(key) as
        | { state: string; revision: number }
      return {
        ok: false,
        conflict: true,
        current: { state: JSON.parse(fresh.state), revision: fresh.revision },
      }
    }
  } else {
    db.prepare(
      'INSERT INTO chart_state (key, state, revision, updated_at, symbol, period) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(key, stateJson, nextRevision, updatedAt, symbol ?? null, period ?? null)
  }

  return { ok: true, revision: nextRevision }
}

export function deleteChartState(key: string): boolean {
  const result = db.prepare('DELETE FROM chart_state WHERE key = ?').run(key)
  return result.changes > 0
}

export function listChartStates(prefix?: string): ChartStateEntry[] {
  const rows = (prefix
    ? db.prepare('SELECT * FROM chart_state WHERE key LIKE ? ORDER BY updated_at DESC').all(`${prefix}%`)
    : db.prepare('SELECT * FROM chart_state ORDER BY updated_at DESC').all()
  ) as ChartStateRow[]

  return rows.map((row) => ({
    key: row.key,
    revision: row.revision,
    savedAt: new Date(row.updated_at).getTime(),
    symbol: row.symbol ?? undefined,
    period: row.period ?? undefined,
  }))
}
