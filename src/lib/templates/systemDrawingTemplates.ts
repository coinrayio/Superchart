/**
 * System (bundled) drawing-tool templates — read-only style presets that
 * ship with Superchart. Adapters that implement the drawing-template API
 * should include these in their `listDrawingTemplates` results with
 * `system: true` and reject deletes against them.
 *
 * Keep this list small and broadly useful. Tool-specific niche presets
 * belong in user storage.
 *
 * Adding a preset:
 * 1. Add to SYSTEM_DRAWING_TEMPLATES below.
 * 2. Mirror the entry in examples/server/src/db.ts so HTTP-mode users see
 *    the same defaults as LocalStorage users.
 */

import type { DrawingTemplate } from '../types/storage'

export const SYSTEM_DRAWING_TEMPLATES: ReadonlyArray<DrawingTemplate> = [
  {
    name: 'Bullish trendline',
    toolName: 'trendLine',
    system: true,
    properties: {
      lineColor: '#22c55e',
      lineWidth: 2,
    },
  },
  {
    name: 'Bearish trendline',
    toolName: 'trendLine',
    system: true,
    properties: {
      lineColor: '#ef4444',
      lineWidth: 2,
    },
  },
  {
    name: 'Support line',
    toolName: 'horizontalRayLine',
    system: true,
    properties: {
      lineColor: '#22c55e',
      lineStyle: 'dashed',
    },
  },
  {
    name: 'Resistance line',
    toolName: 'horizontalRayLine',
    system: true,
    properties: {
      lineColor: '#ef4444',
      lineStyle: 'dashed',
    },
  },
]

/**
 * Filter the system list by tool, returning only matching presets.
 */
export function listSystemDrawingTemplates(toolName: string): DrawingTemplate[] {
  return SYSTEM_DRAWING_TEMPLATES.filter(t => t.toolName === toolName)
}

/**
 * Look up a system drawing template by `(toolName, name)`.
 */
export function findSystemDrawingTemplate(
  toolName: string,
  name: string
): DrawingTemplate | undefined {
  return SYSTEM_DRAWING_TEMPLATES.find(t => t.toolName === toolName && t.name === name)
}

/** Returns true if `(toolName, name)` matches a bundled system template. */
export function isSystemDrawingTemplate(toolName: string, name: string): boolean {
  return SYSTEM_DRAWING_TEMPLATES.some(t => t.toolName === toolName && t.name === name)
}
