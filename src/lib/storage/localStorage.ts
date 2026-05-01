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
} from '../types/storage'

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
}
