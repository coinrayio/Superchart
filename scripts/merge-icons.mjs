#!/usr/bin/env node
/**
 * merge-icons.mjs
 *
 * Merges multiple extracted icon JSON files into one, avoiding key collisions
 * on auto-generated keys like icon_0, icon_1, etc.
 *
 * Usage:
 *   node scripts/merge-icons.mjs batch1.json batch2.json ... > merged.json
 */

import { readFileSync } from 'fs'

const args = process.argv.slice(2)
if (!args.length) {
  console.error('Usage: node scripts/merge-icons.mjs file1.json file2.json ...')
  process.exit(1)
}

const merged = {}
let autoIndex = 0

for (const file of args) {
  const batch = JSON.parse(readFileSync(file, 'utf8'))
  for (const [key, value] of Object.entries(batch)) {
    // Rename colliding auto-generated keys (icon_N) to a global sequence
    const isAuto = /^icon_\d+$/.test(key)
    const finalKey = isAuto
      ? `icon_${autoIndex++}`
      : key in merged
        ? `${key}__${autoIndex++}`  // named key collision — keep both with suffix
        : key
    merged[finalKey] = value
  }
}

process.stdout.write(JSON.stringify(merged, null, 2) + '\n')
console.error(`Merged ${Object.keys(merged).length} entries from ${args.length} file(s)`)
