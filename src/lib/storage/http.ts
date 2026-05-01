/**
 * HttpStorageAdapter — bundled reference implementation of `StorageAdapter`
 * that talks to a REST backend matching the contract in
 * `PERSISTENCE_ROADMAP.md`.
 *
 * Endpoints used:
 *   GET    {baseUrl}/{key}           → 200 { state, revision } | 404
 *   PUT    {baseUrl}/{key}           body { state }
 *                                    optional header `If-Match: <revision>`
 *                                    → 200 { revision }
 *                                    | 409 { remoteState, remoteRevision }
 *   DELETE {baseUrl}/{key}           → 204 | 404
 *   GET    {baseUrl}                 → 200 [{ key, revision, savedAt, ... }]
 *
 * The `examples/server` package implements this contract. Consumers can
 * also point at any server that conforms to it.
 */

import {
  StorageConflictError,
  type ChartState,
  type StorageAdapter,
  type StorageEntry,
  type StorageRecord,
  type StorageWriteResult,
} from '../types/storage'

export interface HttpStorageAdapterOptions {
  /** Base URL for the REST contract (no trailing slash). E.g. `/api/chart-state` or `https://api.example.com/chart-state`. */
  baseUrl: string
  /** Optional per-request header builder (called for every request). Useful for auth tokens. */
  headers?: () => Record<string, string>
  /** Override for tests / non-browser environments. Default: global `fetch`. */
  fetch?: typeof fetch
}

export class HttpStorageAdapter implements StorageAdapter {
  private readonly baseUrl: string
  private readonly buildHeaders: () => Record<string, string>
  private readonly _fetch: typeof fetch

  constructor(options: HttpStorageAdapterOptions) {
    if (!options.baseUrl) {
      throw new Error('HttpStorageAdapter: `baseUrl` is required')
    }
    this.baseUrl = options.baseUrl.replace(/\/$/, '')
    this.buildHeaders = options.headers ?? (() => ({}))
    this._fetch = options.fetch ?? globalThis.fetch.bind(globalThis)
  }

  private url(key?: string): string {
    return key === undefined
      ? this.baseUrl
      : `${this.baseUrl}/${encodeURIComponent(key)}`
  }

  async load(key: string): Promise<StorageRecord | null> {
    const res = await this._fetch(this.url(key), {
      method: 'GET',
      headers: { Accept: 'application/json', ...this.buildHeaders() },
    })
    if (res.status === 404) return null
    if (!res.ok) {
      throw new Error(`HttpStorageAdapter.load failed: ${res.status} ${res.statusText}`)
    }
    const body = (await res.json()) as { state: ChartState; revision: number }
    return { state: body.state, revision: body.revision }
  }

  async save(
    key: string,
    state: ChartState,
    expectedRevision?: number
  ): Promise<StorageWriteResult> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...this.buildHeaders(),
    }
    if (expectedRevision !== undefined) {
      headers['If-Match'] = String(expectedRevision)
    }

    const res = await this._fetch(this.url(key), {
      method: 'PUT',
      headers,
      body: JSON.stringify({ state }),
    })

    if (res.status === 409) {
      // The server reports its current state so we can merge and retry.
      const body = (await res.json()) as { remoteState: ChartState; remoteRevision: number }
      throw new StorageConflictError(
        body.remoteState,
        body.remoteRevision,
        `HttpStorageAdapter conflict: expected revision ${expectedRevision ?? '?'}, server is ${body.remoteRevision}`
      )
    }
    if (!res.ok) {
      throw new Error(`HttpStorageAdapter.save failed: ${res.status} ${res.statusText}`)
    }

    const body = (await res.json()) as { revision: number }
    return { revision: body.revision }
  }

  async delete(key: string): Promise<void> {
    const res = await this._fetch(this.url(key), {
      method: 'DELETE',
      headers: this.buildHeaders(),
    })
    // 404 is treated as success — the resource is already gone.
    if (!res.ok && res.status !== 404) {
      throw new Error(`HttpStorageAdapter.delete failed: ${res.status} ${res.statusText}`)
    }
  }

  async list(prefix?: string): Promise<StorageEntry[]> {
    const url = prefix
      ? `${this.url()}?prefix=${encodeURIComponent(prefix)}`
      : this.url()
    const res = await this._fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json', ...this.buildHeaders() },
    })
    if (!res.ok) {
      throw new Error(`HttpStorageAdapter.list failed: ${res.status} ${res.statusText}`)
    }
    const body = (await res.json()) as StorageEntry[]
    return body
  }
}
