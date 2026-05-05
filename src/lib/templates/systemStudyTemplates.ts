/**
 * System (bundled) study templates — read-only presets that ship with
 * Superchart. Adapters that implement the study-template API should
 * include these in their `listStudyTemplates` results with `system: true`
 * and reject deletes against them.
 *
 * Add common, broadly-useful presets here. Anything user-specific or
 * organisation-specific belongs in user storage.
 */

import type { StudyTemplate } from '../types/storage'

export const SYSTEM_STUDY_TEMPLATES: ReadonlyArray<StudyTemplate> = [
  {
    name: 'RSI 14',
    indicatorName: 'RSI',
    calcParams: [14],
    system: true,
  },
  {
    name: 'MACD 12/26/9',
    indicatorName: 'MACD',
    calcParams: [12, 26, 9],
    system: true,
  },
  {
    name: 'EMA 50',
    indicatorName: 'EMA',
    calcParams: [50],
    system: true,
  },
  {
    name: 'EMA 200',
    indicatorName: 'EMA',
    calcParams: [200],
    system: true,
  },
  {
    name: 'BOLL 20',
    indicatorName: 'BOLL',
    calcParams: [20, 2],
    system: true,
  },
]

/**
 * Look up a system template by name. Used by adapters that delegate to
 * this list when the user-storage layer doesn't have a match.
 */
export function findSystemStudyTemplate(name: string): StudyTemplate | undefined {
  return SYSTEM_STUDY_TEMPLATES.find(t => t.name === name)
}

/** Returns true if the named template is a system (bundled) one. */
export function isSystemStudyTemplate(name: string): boolean {
  return SYSTEM_STUDY_TEMPLATES.some(t => t.name === name)
}
