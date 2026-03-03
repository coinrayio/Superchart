/**
 * Icon Preview Script
 *
 * Reads all .tsx icon files, extracts the SVG markup,
 * and generates an HTML page to preview them in the browser.
 *
 * Usage: node scripts/preview-icons.mjs
 * Then open: scripts/icon-preview.html
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const iconsDir = path.resolve(__dirname, '../src/lib/widget/icons')
const drawingIconsDir = path.resolve(__dirname, '../src/lib/widget/drawing-bar/icons')

function extractSvg(content) {
  // Match the SVG tag and its contents from JSX
  const match = content.match(/<svg[\s\S]*?<\/svg>/i)
  if (!match) return null
  let svg = match[0]
  // Convert JSX attributes to HTML
  svg = svg.replace(/className=/g, 'class=')
  svg = svg.replace(/fillRule=/g, 'fill-rule=')
  svg = svg.replace(/clipRule=/g, 'clip-rule=')
  svg = svg.replace(/strokeLinecap=/g, 'stroke-linecap=')
  svg = svg.replace(/strokeLinejoin=/g, 'stroke-linejoin=')
  // Remove JSX self-closing shorthand issues
  return svg
}

function collectIcons(dir, prefix = '') {
  const icons = []
  if (!fs.existsSync(dir)) return icons
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') && f !== 'index.tsx')
  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), 'utf-8')
    const svg = extractSvg(content)
    if (svg) {
      const name = prefix + path.basename(file, '.tsx')
      icons.push({ name, svg })
    }
  }
  return icons
}

const widgetIcons = collectIcons(iconsDir)
const drawingIcons = collectIcons(drawingIconsDir, 'drawing/')

const allIcons = [...widgetIcons, ...drawingIcons].sort((a, b) => a.name.localeCompare(b.name))

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Superchart Icon Preview</title>
<style>
  body { background: #1e1e1e; color: #ccc; font-family: system-ui, sans-serif; padding: 20px; }
  h1 { color: #fff; margin-bottom: 20px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
  .icon-card {
    background: #2d2d2d; border-radius: 8px; padding: 16px 8px;
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    border: 1px solid #3a3a3a; transition: border-color 0.2s;
  }
  .icon-card:hover { border-color: #5a9cf5; }
  .icon-card svg { color: #e0e0e0; fill: currentColor; }
  .icon-card .name { font-size: 11px; color: #999; text-align: center; word-break: break-all; }
  .icon-card .dims { font-size: 10px; color: #666; }
  .search { width: 100%; max-width: 400px; padding: 8px 12px; margin-bottom: 20px;
    background: #2d2d2d; border: 1px solid #3a3a3a; border-radius: 6px;
    color: #fff; font-size: 14px; outline: none; }
  .search:focus { border-color: #5a9cf5; }
  .count { color: #888; margin-bottom: 16px; font-size: 13px; }
</style>
</head>
<body>
<h1>Superchart Icon Preview</h1>
<input class="search" type="text" placeholder="Filter icons..." oninput="filter(this.value)">
<div class="count">${allIcons.length} icons</div>
<div class="grid" id="grid">
${allIcons.map(({ name, svg }) => {
  const sizeMatch = svg.match(/width="(\d+)".*?height="(\d+)"/)
  const dims = sizeMatch ? `${sizeMatch[1]}×${sizeMatch[2]}` : ''
  return `  <div class="icon-card" data-name="${name}">
    <div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center">${svg}</div>
    <div class="name">${name}</div>
    <div class="dims">${dims}</div>
  </div>`
}).join('\n')}
</div>
<script>
function filter(q) {
  q = q.toLowerCase();
  document.querySelectorAll('.icon-card').forEach(el => {
    el.style.display = el.dataset.name.toLowerCase().includes(q) ? '' : 'none';
  });
}
</script>
</body>
</html>`

const outPath = path.resolve(__dirname, 'icon-preview.html')
fs.writeFileSync(outPath, html)
console.log(`Generated: ${outPath}`)
console.log(`Open in browser: file://${outPath}`)
