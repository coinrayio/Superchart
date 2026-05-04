/**
 * LocalStorageAdapter — bundled reference implementation of `StorageAdapter`
 * that persists chart state in `window.localStorage`.
 *
 * Stores each key as a JSON `{ state, revision, savedAt, symbol, period }`
 * record under a configurable namespace prefix (default `superchart:`).
 * The revision increments on every save, exercising the optimistic-
 * concurrency code path even though real conflicts can't occur with a
 * single device — useful for testing and as a worked example.
 */

import {
  StorageConflictError,
  type ChartState,
  type StorageAdapter,
  type StorageEntry,
  type StorageRecord,
  type StorageWriteResult,
  type StudyTemplate,
  type StudyTemplateMeta,
  type DrawingTemplate,
  type DrawingTemplateMeta,
} from '../types/storage'
import {
  SYSTEM_STUDY_TEMPLATES,
  findSystemStudyTemplate,
  isSystemStudyTemplate,
} from '../templates/systemStudyTemplates'
import {
  listSystemDrawingTemplates,
  findSystemDrawingTemplate,
  isSystemDrawingTemplate,
} from '../templates/systemDrawingTemplates'

interface StoredBlob {
  state: ChartState
  revision: number
  savedAt: number
  symbol?: string
  period?: string
}

export interface LocalStorageAdapterOptions {
  /** Prefix prepended to every key when reading/writing localStorage. Default: `superchart:` */
  prefix?: string
  /** Override for tests / non-browser environments. Default: `window.localStorage` */
  storage?: Storage
}

const DEFAULT_PREFIX = 'superchart:'

export class LocalStorageAdapter implements StorageAdapter {
  private readonly prefix: string
  private readonly storage: Storage

  constructor(options: LocalStorageAdapterOptions = {}) {
    this.prefix = options.prefix ?? DEFAULT_PREFIX
    if (options.storage) {
      this.storage = options.storage
    } else if (typeof window !== 'undefined' && window.localStorage) {
      this.storage = window.localStorage
    } else {
      throw new Error(
        'LocalStorageAdapter: no storage available. Pass `storage` explicitly when running outside a browser.'
      )
    }
  }

  private fullKey(key: string): string {
    return `${this.prefix}${key}`
  }

  private readBlob(key: string): StoredBlob | null {
    const raw = this.storage.getItem(this.fullKey(key))
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as Partial<StoredBlob>
      if (!parsed || typeof parsed !== 'object' || !parsed.state || typeof parsed.revision !== 'number') {
        return null
      }
      return parsed as StoredBlob
    } catch {
      return null
    }
  }

  async load(key: string): Promise<StorageRecord | null> {
    const blob = this.readBlob(key)
    if (!blob) return null
    return { state: blob.state, revision: blob.revision }
  }

  async save(
    key: string,
    state: ChartState,
    expectedRevision?: number
  ): Promise<StorageWriteResult> {
    const current = this.readBlob(key)
    const currentRevision = current?.revision ?? 0

    if (expectedRevision !== undefined && currentRevision !== expectedRevision) {
      // Caller's view of history is stale — surface the remote so they can merge.
      throw new StorageConflictError(
        current?.state ?? state,
        currentRevision,
        `LocalStorageAdapter conflict: expected revision ${expectedRevision}, current is ${currentRevision}`
      )
    }

    const next: StoredBlob = {
      state,
      revision: currentRevision + 1,
      savedAt: Date.now(),
      symbol: state.symbol,
      period: state.period,
    }
    this.storage.setItem(this.fullKey(key), JSON.stringify(next))
    return { revision: next.revision }
  }

  async delete(key: string): Promise<void> {
    this.storage.removeItem(this.fullKey(key))
  }

  async list(prefix?: string): Promise<StorageEntry[]> {
    const filterPrefix = `${this.prefix}${prefix ?? ''}`
    const entries: StorageEntry[] = []
    // `Storage.length` and `key(i)` is the only reliable cross-browser way to
    // iterate localStorage keys.
    for (let i = 0; i < this.storage.length; i++) {
      const fullKey = this.storage.key(i)
      if (!fullKey || !fullKey.startsWith(filterPrefix)) continue
      const blob = this.readBlob(fullKey.slice(this.prefix.length))
      if (!blob) continue
      entries.push({
        key: fullKey.slice(this.prefix.length),
        revision: blob.revision,
        savedAt: blob.savedAt,
        symbol: blob.symbol,
        period: blob.period,
      })
    }
    return entries
  }

  // ---- Study templates (Ticket 4) ----
  // System templates are merged in from the bundled list. User templates
  // live under a separate prefix so iteration is cheap and they can't
  // collide with chart-state keys.

  private studyKey(name: string): string {
    return `${this.prefix}study-template:${name}`
  }

  async listStudyTemplates(indicatorName?: string): Promise<StudyTemplateMeta[]> {
    const out: StudyTemplateMeta[] = []
    // System templates first so they sort to the top in UIs that rely on
    // insertion order. They're also non-deletable.
    for (const t of SYSTEM_STUDY_TEMPLATES) {
      if (indicatorName && t.indicatorName !== indicatorName) continue
      out.push({
        name: t.name,
        indicatorName: t.indicatorName,
        system: true,
        savedAt: t.savedAt,
      })
    }
    const userPrefix = `${this.prefix}study-template:`
    for (let i = 0; i < this.storage.length; i++) {
      const fullKey = this.storage.key(i)
      if (!fullKey || !fullKey.startsWith(userPrefix)) continue
      const raw = this.storage.getItem(fullKey)
      if (!raw) continue
      try {
        const tpl = JSON.parse(raw) as StudyTemplate
        if (!tpl || typeof tpl !== 'object' || !tpl.name || !tpl.indicatorName) continue
        if (indicatorName && tpl.indicatorName !== indicatorName) continue
        out.push({
          name: tpl.name,
          indicatorName: tpl.indicatorName,
          savedAt: tpl.savedAt,
        })
      } catch {
        // Skip corrupt entries silently — listing should never throw.
      }
    }
    return out
  }

  async loadStudyTemplate(name: string): Promise<StudyTemplate | null> {
    // Check user storage first so a user can shadow a system template
    // with the same name (e.g. tweak our default RSI 14).
    const raw = this.storage.getItem(this.studyKey(name))
    if (raw) {
      try {
        return JSON.parse(raw) as StudyTemplate
      } catch {
        return null
      }
    }
    return findSystemStudyTemplate(name) ?? null
  }

  async saveStudyTemplate(name: string, template: StudyTemplate): Promise<void> {
    // We allow saving over a system name — the user copy shadows the
    // system one on subsequent loads. listStudyTemplates returns both
    // entries; that's acceptable since names are unique within the
    // user-storage namespace.
    const blob: StudyTemplate = { ...template, name, savedAt: Date.now(), system: false }
    this.storage.setItem(this.studyKey(name), JSON.stringify(blob))
  }

  async deleteStudyTemplate(name: string): Promise<void> {
    if (isSystemStudyTemplate(name) && !this.storage.getItem(this.studyKey(name))) {
      throw new Error(`Cannot delete system study template "${name}"`)
    }
    this.storage.removeItem(this.studyKey(name))
  }

  // ---- Drawing templates (Ticket 5) ----
  // Per-tool keyed: a "default" trendLine template doesn't collide with
  // a "default" fibSegment template. System templates merge in from the
  // bundled list; user templates persist under their own prefix.

  private drawingKey(toolName: string, name: string): string {
    return `${this.prefix}drawing-template:${toolName}:${name}`
  }

  async listDrawingTemplates(toolName: string): Promise<DrawingTemplateMeta[]> {
    const out: DrawingTemplateMeta[] = []
    for (const t of listSystemDrawingTemplates(toolName)) {
      out.push({ name: t.name, toolName: t.toolName, system: true, savedAt: t.savedAt })
    }
    const userPrefix = `${this.prefix}drawing-template:${toolName}:`
    for (let i = 0; i < this.storage.length; i++) {
      const fullKey = this.storage.key(i)
      if (!fullKey || !fullKey.startsWith(userPrefix)) continue
      const raw = this.storage.getItem(fullKey)
      if (!raw) continue
      try {
        const tpl = JSON.parse(raw) as DrawingTemplate
        if (!tpl || typeof tpl !== 'object' || !tpl.name || !tpl.toolName) continue
        out.push({ name: tpl.name, toolName: tpl.toolName, savedAt: tpl.savedAt })
      } catch {
        // Corrupt entries don't break listing.
      }
    }
    return out
  }

  async loadDrawingTemplate(toolName: string, name: string): Promise<DrawingTemplate | null> {
    const raw = this.storage.getItem(this.drawingKey(toolName, name))
    if (raw) {
      try {
        return JSON.parse(raw) as DrawingTemplate
      } catch {
        return null
      }
    }
    return findSystemDrawingTemplate(toolName, name) ?? null
  }

  async saveDrawingTemplate(
    toolName: string,
    name: string,
    template: DrawingTemplate
  ): Promise<void> {
    // Saving over a system name creates a user copy that shadows the
    // system entry — same semantics as study templates.
    const blob: DrawingTemplate = {
      ...template,
      name,
      toolName,
      savedAt: Date.now(),
      system: false,
    }
    this.storage.setItem(this.drawingKey(toolName, name), JSON.stringify(blob))
  }

  async deleteDrawingTemplate(toolName: string, name: string): Promise<void> {
    if (
      isSystemDrawingTemplate(toolName, name) &&
      !this.storage.getItem(this.drawingKey(toolName, name))
    ) {
      throw new Error(`Cannot delete system drawing template "${toolName}:${name}"`)
    }
    this.storage.removeItem(this.drawingKey(toolName, name))
  }
}
