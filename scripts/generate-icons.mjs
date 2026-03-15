#!/usr/bin/env node
/**
 * generate-icons.mjs
 *
 * Converts a JSON file of extracted TradingView SVG icons into TSX React components.
 *
 * Usage:
 *   node scripts/generate-icons.mjs <path-to-icons.json>
 *
 * The JSON format matches the output of the DevTools extraction script:
 *   {
 *     "icon-key": { "viewBox": "0 0 28 28", "paths": ["<path .../>", ...] },
 *     ...
 *   }
 *
 * Add new entries to the `mapping` object below to assign meaningful names and
 * destinations ('main' → src/lib/widget/icons/, 'drawing' → drawing-bar/icons/).
 * Unknown keys are skipped with a warning.
 */

import { writeFileSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

// ---------------------------------------------------------------------------
// Name mapping — add entries here when you extract new icon batches
// ---------------------------------------------------------------------------
// dest: 'main'    → src/lib/widget/icons/
//       'drawing' → src/lib/widget/drawing-bar/icons/
const mapping = {
  // ── General UI chrome ──────────────────────────────────────────────────
  'search':                                    { name: 'search',               dest: 'main' },
  'zoom':                                      { name: 'zoom',                 dest: 'main' },
  'maximize':                                  { name: 'maximize',             dest: 'main' },
  'detach':                                    { name: 'detach',               dest: 'main' },
  'go-to-date':                                { name: 'goToDate',             dest: 'main' },
  'toast-group-close-button-orders':           { name: 'close',                dest: 'main' },
  'buttonIcon-JQv8nO8e':                       { name: 'moreHorizontal',       dest: 'main' },
  'icon-WB2y0EnP':                             { name: 'chevronDown',          dest: 'main' },
  'icon-GwQQdU8S':                             { name: 'star',                 dest: 'main' },
  'alerts':                                    { name: 'alertBell',            dest: 'main' },
  'base':                                      { name: 'bookmark',             dest: 'main' },
  'help-button':                               { name: 'help',                 dest: 'main' },

  // icon_52 → horizontal bar (minus), icon_53 → cross (+), icon_54 → two L-corners (expand),
  // icon_55 → single chevron-right, icon_56 → circular refresh arrow, icon_57 → bold chevron-right
  // (old tv-icons.json used icon_54/55/57/58 — those will just be skipped if not in the JSON)
  'icon_52':                                   { name: 'minus',                dest: 'main' },
  'icon_53':                                   { name: 'plus',                 dest: 'main' },
  'icon_54':                                   { name: 'expandCorners',        dest: 'main' },
  'icon_55':                                   { name: 'chevronRight',         dest: 'main' },
  'icon_56':                                   { name: 'refresh',              dest: 'main' },
  'icon_57':                                   { name: 'chevronRightBold',     dest: 'main' },
  // kept for backward-compat with older tv-icons.json extractions
  'icon_42':                                   { name: 'layers',               dest: 'main' },
  'icon_58':                                   { name: 'refreshAlt',           dest: 'main' },

  // opaque hash-named icons identified by SVG content
  'icon-JQZ0HKD4':                             { name: 'priceTag',             dest: 'main' },  // pentagon label pointing down
  'icon-O36zDbH4':                             { name: 'bell',                 dest: 'main' },  // 18×18 bell (smaller than alertBell)
  'icon-aGeQPIIx':                             { name: 'compare',              dest: 'main' },  // rounded-rect frame (compare/overlay)
  'icon_16':                                   { name: 'editPointer',          dest: 'main' },  // cursor + edit indicator
  'icon_38':                                   { name: 'circleDot',            dest: 'main' },  // filled circle
  'icon_40':                                   { name: 'diamond',              dest: 'main' },  // rotated square / data-point marker
  'iconArrow-l31H9iuA':                        { name: 'caretDown',            dest: 'main' },  // 15×15 caret pointing down
  'currency-label-selector':                   { name: 'chevronTiny',          dest: 'main' },  // 7×5 micro chevron

  // toolbar / action buttons
  'open-indicators-dialog':                    { name: 'indicators',           dest: 'main' },
  'actions':                                   { name: 'orders',               dest: 'main' },  // shopping-bag / orders icon
  'toggle-visibility-button':                  { name: 'chevronUp',            dest: 'main' },
  'new-chat':                                  { name: 'newChat',              dest: 'main' },
  'mentions':                                  { name: 'mentions',             dest: 'main' },
  'widgetbar-pages-with-tabs':                 { name: 'widgetTabs',           dest: 'main' },
  'widgetbar-wrap':                            { name: 'sidebarHandle',        dest: 'main' },
  'settings':                                  { name: 'settingsDots',         dest: 'main' },  // 3-dot menu (may dedup with moreHorizontal)
  'settings-button':                           { name: 'settingsDotsBtn',      dest: 'main' },
  'popup-menu-container':                      { name: 'popupMenu',            dest: 'main' },
  'indicator-templates-menu':                  { name: 'templates',            dest: 'main' },
  'add-symbol-button':                         { name: 'addSymbol',            dest: 'main' },
  'advanced-view-button':                      { name: 'advancedView',         dest: 'main' },
  'details-metrics-button':                    { name: 'metricsGrid',          dest: 'main' },
  'details-add-note-button':                   { name: 'addNote',              dest: 'main' },
  'save-load-menu-item-clone':                 { name: 'clone',                dest: 'main' },
  'save-load-menu-item-rename':                { name: 'rename',               dest: 'main' },
  'tree':                                      { name: 'trashSmall',           dest: 'main' },  // 18×18 trash/delete

  // ── Floating settings / overlay popup icons ─────────────────────────
  'line-tool-color':                           { name: 'lineToolColor',        dest: 'main' },  // pencil icon for border/line color
  'text-color':                                { name: 'textColor',            dest: 'main' },  // "T" with baseline — text color
  'style-menu':                                { name: 'lineStyle',            dest: 'main' },  // dotted line — line style (dashed/dotted)
  'line-tool-width':                           { name: 'lineWidth',            dest: 'main' },  // single line — line width
  'drawing-toolbar':                           { name: 'dragHandle',           dest: 'main' },  // 2×3 dot grid — drag handle
  'icon-GJX1EXhk':                            { name: 'eyeHidden',            dest: 'main' },  // eye with slash — visibility off
  'icon_2':                                    { name: 'visualOrder',          dest: 'main' },  // stacked layers — visual order

  // ── Right-sidebar panel icons (44×44) ─────────────────────────────────
  'object_tree':                               { name: 'objectTree',           dest: 'main' },
  'union_chats':                               { name: 'chats',                dest: 'main' },
  'screener-dialog-button':                    { name: 'screener',             dest: 'main' },
  'pine-dialog-button':                        { name: 'pineScript',           dest: 'main' },
  'calendar-dialog-button':                    { name: 'calendar',             dest: 'main' },
  'community-hub-button':                      { name: 'community',            dest: 'main' },
  'notifications-button':                      { name: 'notifications',        dest: 'main' },
  'right-toolbar':                             { name: 'moreApps',             dest: 'main' },

  // ── Drawing-bar controls ───────────────────────────────────────────────
  'linetool-group-cursors':                    { name: 'cursorGroup',          dest: 'drawing' },
  'linetool-group-trend-line':                 { name: 'trendLineGroup',       dest: 'drawing' },
  'linetool-group-gann-and-fibonacci':         { name: 'gannFibGroup',         dest: 'drawing' },
  'linetool-group-patterns':                   { name: 'patternsGroup',        dest: 'drawing' },
  'linetool-group-prediction-and-measurement': { name: 'predictionGroup',      dest: 'drawing' },
  'linetool-group-geometric-shapes':           { name: 'shapesGroup',          dest: 'drawing' },
  'linetool-group-annotation':                 { name: 'annotationGroup',      dest: 'drawing' },
  'linetool-group-font-icons':                 { name: 'emojiGroup',           dest: 'drawing' },
  'measure':                                   { name: 'ruler',                dest: 'drawing' },
  'magnet-button':                             { name: 'magnet',               dest: 'drawing' },
  'strongMagnet':                              { name: 'strongMagnet',         dest: 'drawing' },
  'lockAllDrawings':                           { name: 'lockAll',              dest: 'drawing' },
  'hide-all':                                  { name: 'hideAll',              dest: 'drawing' },
  'drawginmode':                               { name: 'drawingMode',          dest: 'drawing' },
  'removeAllDrawingTools':                     { name: 'removeAll',            dest: 'drawing' },

  // ── Drawing cursor/marker tools ────────────────────────────────────────
  'cursor':                                    { name: 'cursorStar',           dest: 'drawing' },  // star-shaped active cursor
  'dot':                                       { name: 'dotMarker',            dest: 'drawing' },
  'arrow':                                     { name: 'arrowMarker',          dest: 'drawing' },
  'demonstration':                             { name: 'brushPath',            dest: 'drawing' },
  'eraser':                                    { name: 'eraser',               dest: 'drawing' },

  // ── Line / trend tools ─────────────────────────────────────────────────
  'LineToolRay':                               { name: 'lineToolRay',          dest: 'drawing' },
  'LineToolInfoLine':                          { name: 'lineToolInfoLine',     dest: 'drawing' },
  'LineToolExtended':                          { name: 'lineToolExtended',     dest: 'drawing' },
  'LineToolTrendAngle':                        { name: 'lineToolTrendAngle',   dest: 'drawing' },
  'LineToolHorzLine':                          { name: 'lineToolHorzLine',     dest: 'drawing' },
  'LineToolHorzRay':                           { name: 'lineToolHorzRay',      dest: 'drawing' },
  'LineToolVertLine':                          { name: 'lineToolVertLine',     dest: 'drawing' },
  'LineToolCrossLine':                         { name: 'lineToolCrossLine',    dest: 'drawing' },
  'LineToolParallelChannel':                   { name: 'lineToolParallel',     dest: 'drawing' },
  'LineToolRegressionTrend':                   { name: 'lineToolRegression',   dest: 'drawing' },
  'LineToolFlatBottom':                        { name: 'lineToolFlatBottom',   dest: 'drawing' },
  'LineToolDisjointAngle':                     { name: 'lineToolDisjoint',     dest: 'drawing' },

  // ── Pitchfork / Gann ──────────────────────────────────────────────────
  'LineToolPitchfork':                         { name: 'lineToolPitchfork',    dest: 'drawing' },
  'LineToolSchiffPitchfork2':                  { name: 'lineToolSchiff2',      dest: 'drawing' },
  'LineToolSchiffPitchfork':                   { name: 'lineToolSchiff',       dest: 'drawing' },
  'LineToolInsidePitchfork':                   { name: 'lineToolInsidePitch',  dest: 'drawing' },
  'LineToolPitchfan':                          { name: 'lineToolPitchfan',     dest: 'drawing' },
  'LineToolGannSquare':                        { name: 'lineToolGannSquare',   dest: 'drawing' },
  'LineToolGannFixed':                         { name: 'lineToolGannFixed',    dest: 'drawing' },
  'LineToolGannComplex':                       { name: 'lineToolGannComplex',  dest: 'drawing' },
  'LineToolGannFan':                           { name: 'lineToolGannFan',      dest: 'drawing' },

  // ── Fibonacci ─────────────────────────────────────────────────────────
  'LineToolTrendBasedFibExtension':            { name: 'lineToolFibExtension', dest: 'drawing' },
  'LineToolFibChannel':                        { name: 'lineToolFibChannel',   dest: 'drawing' },
  'LineToolFibTimeZone':                       { name: 'lineToolFibTimeZone',  dest: 'drawing' },
  'LineToolFibSpeedResistanceFan':             { name: 'lineToolFibSRFan',     dest: 'drawing' },
  'LineToolTrendBasedFibTime':                 { name: 'lineToolFibTime',      dest: 'drawing' },
  'LineToolFibCircles':                        { name: 'lineToolFibCircles',   dest: 'drawing' },
  'LineToolFibSpiral':                         { name: 'lineToolFibSpiral',    dest: 'drawing' },
  'LineToolFibSpeedResistanceArcs':            { name: 'lineToolFibSRArcs',    dest: 'drawing' },
  'LineToolFibWedge':                          { name: 'lineToolFibWedge',     dest: 'drawing' },

  // ── Chart patterns ────────────────────────────────────────────────────
  'LineToolCypherPattern':                     { name: 'lineToolCypher',       dest: 'drawing' },
  'LineToolHeadAndShoulders':                  { name: 'lineToolHnS',          dest: 'drawing' },
  'LineToolABCD':                              { name: 'lineToolABCD',         dest: 'drawing' },
  'LineToolTrianglePattern':                   { name: 'lineToolTrianglePat',  dest: 'drawing' },
  'LineToolThreeDrivers':                      { name: 'lineToolThreeDrivers', dest: 'drawing' },

  // ── Elliott wave ──────────────────────────────────────────────────────
  'LineToolElliottImpulse':                    { name: 'lineToolElliottI',     dest: 'drawing' },
  'LineToolElliottCorrection':                 { name: 'lineToolElliottC',     dest: 'drawing' },
  'LineToolElliottTriangle':                   { name: 'lineToolElliottT',     dest: 'drawing' },
  'LineToolElliottDoubleCombo':                { name: 'lineToolElliottD',     dest: 'drawing' },
  'LineToolElliottTripleCombo':                { name: 'lineToolElliottTr',    dest: 'drawing' },

  // ── Cycles / time tools ───────────────────────────────────────────────
  'LineToolCircleLines':                       { name: 'lineToolCircleLines',  dest: 'drawing' },
  'LineToolTimeCycles':                        { name: 'lineToolTimeCycles',   dest: 'drawing' },
  'LineToolSineLine':                          { name: 'lineToolSine',         dest: 'drawing' },

  // ── Prediction / measurement ──────────────────────────────────────────
  'LineToolRiskRewardShort':                   { name: 'lineToolRiskReward',   dest: 'drawing' },
  'LineToolPrediction':                        { name: 'lineToolPrediction',   dest: 'drawing' },
  'LineToolBarsPattern':                       { name: 'lineToolBarsPattern',  dest: 'drawing' },
  'LineToolGhostFeed':                         { name: 'lineToolGhostFeed',    dest: 'drawing' },
  'LineToolProjection':                        { name: 'lineToolProjection',   dest: 'drawing' },

  // ── Volume / VWAP ─────────────────────────────────────────────────────
  'LineToolAnchoredVWAP':                      { name: 'lineToolVWAP',         dest: 'drawing' },
  'LineToolFixedRangeVolumeProfile':           { name: 'lineToolFixedVol',     dest: 'drawing' },
  'LineToolAnchoredVolumeProfile':             { name: 'lineToolAnchorVol',    dest: 'drawing' },

  // ── Price / date range ────────────────────────────────────────────────
  'LineToolPriceRange':                        { name: 'lineToolPriceRange',   dest: 'drawing' },
  'LineToolDateRange':                         { name: 'lineToolDateRange',    dest: 'drawing' },
  'LineToolDateAndPriceRange':                 { name: 'lineToolDatePrice',    dest: 'drawing' },

  // ── Geometric shapes ──────────────────────────────────────────────────
  'LineToolHighlighter':                       { name: 'lineToolHighlighter',  dest: 'drawing' },
  'LineToolRectangle':                         { name: 'lineToolRect',         dest: 'drawing' },
  'LineToolRotatedRectangle':                  { name: 'lineToolRotRect',      dest: 'drawing' },
  'LineToolCircle':                            { name: 'lineToolCircle',       dest: 'drawing' },
  'LineToolEllipse':                           { name: 'lineToolEllipse',      dest: 'drawing' },
  'LineToolTriangle':                          { name: 'lineToolTriangle',     dest: 'drawing' },
  'LineToolArc':                               { name: 'lineToolArc',          dest: 'drawing' },
  'LineToolPolyline':                          { name: 'lineToolPolyline',     dest: 'drawing' },
  'LineToolPath':                              { name: 'lineToolPath',         dest: 'drawing' },
  'LineToolBezierQuadro':                      { name: 'lineToolBezierQ',      dest: 'drawing' },
  'LineToolBezierCubic':                       { name: 'lineToolBezierC',      dest: 'drawing' },

  // ── Arrows ────────────────────────────────────────────────────────────
  'LineToolArrowMarker':                       { name: 'lineToolArrowMark',    dest: 'drawing' },
  'LineToolArrow':                             { name: 'lineToolArrow',        dest: 'drawing' },
  'LineToolArrowMarkUp':                       { name: 'lineToolArrowUp',      dest: 'drawing' },
  'LineToolArrowMarkDown':                     { name: 'lineToolArrowDown',    dest: 'drawing' },

  // ── Annotations / labels ──────────────────────────────────────────────
  'LineToolTextAbsolute':                      { name: 'lineToolText',         dest: 'drawing' },
  'LineToolTextNote':                          { name: 'lineToolTextNote',     dest: 'drawing' },
  'LineToolPriceNote':                         { name: 'lineToolPriceNote',    dest: 'drawing' },
  'LineToolNote':                              { name: 'lineToolNote',         dest: 'drawing' },
  'LineToolCallout':                           { name: 'lineToolCallout',      dest: 'drawing' },
  'LineToolComment':                           { name: 'lineToolComment',      dest: 'drawing' },
  'LineToolPriceLabel':                        { name: 'lineToolPriceLabel',   dest: 'drawing' },
  'LineToolSignpost':                          { name: 'lineToolSignpost',     dest: 'drawing' },
  'LineToolFlagMark':                          { name: 'lineToolFlag',         dest: 'drawing' },
  'LineToolTable':                             { name: 'lineToolTable',        dest: 'drawing' },
  'LineToolImage':                             { name: 'lineToolImage',        dest: 'drawing' },
  'LineToolTweet':                             { name: 'lineToolTweet',        dest: 'drawing' },
  'LineToolIdea':                              { name: 'lineToolIdea',         dest: 'drawing' },

  // ── FavoriteToolbar shortcuts (older extraction — kept for backward compat) ──
  'FavoriteToolbarLineToolHorzLine':           { name: 'favHorzLine',          dest: 'drawing' },
  'FavoriteToolbarLineToolHorzRay':            { name: 'favHorzRay',           dest: 'drawing' },
  'FavoriteToolbarLineToolCrossLine':          { name: 'favCrossLine',         dest: 'drawing' },
  'FavoriteToolbarLineToolVertLine':           { name: 'favVertLine',          dest: 'drawing' },
  'FavoriteToolbarLineToolPath':               { name: 'favPath',              dest: 'drawing' },
  'FavoriteToolbarLineToolArrow':              { name: 'favArrow',             dest: 'drawing' },
  'FavoriteToolbarLineToolRiskRewardShort':    { name: 'favRiskReward',        dest: 'drawing' },
}

// ---------------------------------------------------------------------------
// JSX attribute conversion (HTML kebab-case → camelCase)
// ---------------------------------------------------------------------------
const ATTR_MAP = {
  'fill-rule':          'fillRule',
  'clip-rule':          'clipRule',
  'stroke-width':       'strokeWidth',
  'stroke-linecap':     'strokeLinecap',
  'stroke-linejoin':    'strokeLinejoin',
  'stroke-dasharray':   'strokeDasharray',
  'stroke-miterlimit':  'strokeMiterlimit',
  // Also handle non-hyphenated variants (some SVGs use lowercase without hyphens)
  'fillrule':           'fillRule',
  'cliprule':           'clipRule',
  'strokewidth':        'strokeWidth',
  'strokelinecap':      'strokeLinecap',
  'strokelinejoin':     'strokeLinejoin',
  'strokedasharray':    'strokeDasharray',
  'strokemiterlimit':   'strokeMiterlimit',
}

function toJsx(html) {
  let out = html
  for (const [from, to] of Object.entries(ATTR_MAP)) {
    out = out.replaceAll(`${from}=`, `${to}=`)
  }
  // Also handle `class=` → `className=` (rare in SVG paths but possible)
  out = out.replaceAll('class=', 'className=')
  return out
}

// ---------------------------------------------------------------------------
// TSX component template
// ---------------------------------------------------------------------------
function makeComponent(viewBox, paths) {
  const vb = viewBox || '0 0 28 28'
  const parts = vb.split(' ')
  const w = parts[2] ?? '28'
  const h = parts[3] ?? '28'
  const body = paths.map(p => `    ${toJsx(p)}`).join('\n')
  return `export default () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${w}" height="${h}" fill="currentColor">
${body}
  </svg>
)\n`
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const arg = process.argv[2]
if (!arg) {
  console.error('Usage: node scripts/generate-icons.mjs <path-to-icons.json>')
  process.exit(1)
}

const raw = readFileSync(arg, 'utf8')
const icons = JSON.parse(raw)

const dirs = {
  main:    join(root, 'src/lib/widget/icons'),
  drawing: join(root, 'src/lib/widget/drawing-bar/icons'),
}

const generated = { main: [], drawing: [] }
const reexported = []
const skipped = []

// fingerprint → { name, dest } — for deduplication across keys
const contentMap = new Map()

function fingerprint(viewBox, paths) {
  return `${viewBox ?? ''}|${paths.join('|')}`
}

for (const [key, { viewBox, paths }] of Object.entries(icons)) {
  const target = mapping[key]
  if (!target) {
    skipped.push(key)
    continue
  }

  const fp = fingerprint(viewBox, paths)
  const existing = contentMap.get(fp)

  if (existing) {
    if (existing.dest === target.dest) {
      // Same destination — identical icon already written; skip entirely
      console.warn(`⚠  Skipped ${target.dest}/${target.name} — duplicate of ${existing.dest}/${existing.name}`)
    } else {
      // Different destination — write a re-export so there is one source of truth
      const rel =
        target.dest === 'drawing'
          ? `../../icons/${existing.name}`
          : `../../drawing-bar/icons/${existing.name}`
      const reFile = join(dirs[target.dest], `${target.name}.tsx`)
      writeFileSync(reFile, `export { default } from '${rel}'\n`, 'utf8')
      reexported.push(`${target.dest}/${target.name} → ${existing.dest}/${existing.name}`)
      console.log(`↗  ${target.dest}/${target.name}.tsx  (re-exports ${existing.dest}/${existing.name})`)
    }
    continue
  }

  const code = makeComponent(viewBox, paths)
  const file = join(dirs[target.dest], `${target.name}.tsx`)
  writeFileSync(file, code, 'utf8')
  contentMap.set(fp, { name: target.name, dest: target.dest })
  generated[target.dest].push(target.name)
  console.log(`✓  ${target.dest}/${target.name}.tsx`)
}

const total = generated.main.length + generated.drawing.length
console.log(`\nGenerated ${total} icon(s)`)
if (generated.main.length)    console.log(`  main:    ${generated.main.join(', ')}`)
if (generated.drawing.length) console.log(`  drawing: ${generated.drawing.join(', ')}`)
if (reexported.length)        console.log(`  re-exported (${reexported.length}): ${reexported.join(', ')}`)
if (skipped.length)           console.log(`  skipped (no mapping): ${skipped.join(', ')}`)
