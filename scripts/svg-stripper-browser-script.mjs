// Run in Chrome DevTools → Console on a TradingView chart page
const seen = new Set()
const result = {}

document.querySelectorAll('svg').forEach(svg => {
  // Try to infer a name from a parent data-name or class
  const el = svg.closest('[data-name]') ?? svg.closest('[class]')
  const name = el?.dataset?.name
    ?? el?.className?.split(' ').find(c => c.includes('icon') || c.includes('Icon'))
    ?? null
  const key = name ?? `icon_${seen.size}`

  if (!seen.has(svg.outerHTML)) {
    seen.add(svg.outerHTML)
    result[key] = {
      viewBox: svg.getAttribute('viewBox'),
      paths: [...svg.querySelectorAll('path,rect,circle,polygon,polyline')]
        .map(p => p.outerHTML),
    }
  }
})

copy(JSON.stringify(result, null, 2))  // copies to clipboard
console.log(`Extracted ${Object.keys(result).length} unique SVGs`)