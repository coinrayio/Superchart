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
  type StudyTemplate,
  type StudyTemplateMeta,
  type DrawingTemplate,
  type DrawingTemplateMeta,
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

  // ---- Study templates (Ticket 4) ----
  // Endpoints live at the parent of `baseUrl` to avoid collision with
  // chart-state keys: if baseUrl is `/api/chart-state`, study templates
  // are at `/api/study-templates`. Server is responsible for merging
  // bundled "system" templates into list responses.

  private studyTemplatesBase(): string {
    // Walk one path segment up from baseUrl. Same origin assumed.
    const idx = this.baseUrl.lastIndexOf('/')
    const root = idx > 0 ? this.baseUrl.slice(0, idx) : ''
    return `${root}/study-templates`
  }

  private studyTemplateUrl(name: string): string {
    return `${this.studyTemplatesBase()}/${encodeURIComponent(name)}`
  }

  async listStudyTemplates(indicatorName?: string): Promise<StudyTemplateMeta[]> {
    const url = indicatorName
      ? `${this.studyTemplatesBase()}?indicatorName=${encodeURIComponent(indicatorName)}`
      : this.studyTemplatesBase()
    const res = await this._fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json', ...this.buildHeaders() },
    })
    if (!res.ok) {
      throw new Error(`HttpStorageAdapter.listStudyTemplates failed: ${res.status} ${res.statusText}`)
    }
    return (await res.json()) as StudyTemplateMeta[]
  }

  async loadStudyTemplate(name: string): Promise<StudyTemplate | null> {
    const res = await this._fetch(this.studyTemplateUrl(name), {
      method: 'GET',
      headers: { Accept: 'application/json', ...this.buildHeaders() },
    })
    if (res.status === 404) return null
    if (!res.ok) {
      throw new Error(`HttpStorageAdapter.loadStudyTemplate failed: ${res.status} ${res.statusText}`)
    }
    return (await res.json()) as StudyTemplate
  }

  async saveStudyTemplate(name: string, template: StudyTemplate): Promise<void> {
    const res = await this._fetch(this.studyTemplateUrl(name), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...this.buildHeaders(),
      },
      body: JSON.stringify(template),
    })
    if (!res.ok) {
      throw new Error(`HttpStorageAdapter.saveStudyTemplate failed: ${res.status} ${res.statusText}`)
    }
  }

  async deleteStudyTemplate(name: string): Promise<void> {
    const res = await this._fetch(this.studyTemplateUrl(name), {
      method: 'DELETE',
      headers: this.buildHeaders(),
    })
    if (!res.ok && res.status !== 404) {
      // 403 indicates the server refused to delete a system template.
      throw new Error(`HttpStorageAdapter.deleteStudyTemplate failed: ${res.status} ${res.statusText}`)
    }
  }

  // ---- Drawing templates (Ticket 5) ----
  // Same parent-of-baseUrl pattern as study templates, plus a `:toolName`
  // path segment so a "default" trendLine template doesn't collide with
  // a "default" fibSegment template.

  private drawingTemplatesBase(toolName: string): string {
    const idx = this.baseUrl.lastIndexOf('/')
    const root = idx > 0 ? this.baseUrl.slice(0, idx) : ''
    return `${root}/drawing-templates/${encodeURIComponent(toolName)}`
  }

  private drawingTemplateUrl(toolName: string, name: string): string {
    return `${this.drawingTemplatesBase(toolName)}/${encodeURIComponent(name)}`
  }

  async listDrawingTemplates(toolName: string): Promise<DrawingTemplateMeta[]> {
    const res = await this._fetch(this.drawingTemplatesBase(toolName), {
      method: 'GET',
      headers: { Accept: 'application/json', ...this.buildHeaders() },
    })
    if (!res.ok) {
      throw new Error(`HttpStorageAdapter.listDrawingTemplates failed: ${res.status} ${res.statusText}`)
    }
    return (await res.json()) as DrawingTemplateMeta[]
  }

  async loadDrawingTemplate(toolName: string, name: string): Promise<DrawingTemplate | null> {
    const res = await this._fetch(this.drawingTemplateUrl(toolName, name), {
      method: 'GET',
      headers: { Accept: 'application/json', ...this.buildHeaders() },
    })
    if (res.status === 404) return null
    if (!res.ok) {
      throw new Error(`HttpStorageAdapter.loadDrawingTemplate failed: ${res.status} ${res.statusText}`)
    }
    return (await res.json()) as DrawingTemplate
  }

  async saveDrawingTemplate(
    toolName: string,
    name: string,
    template: DrawingTemplate
  ): Promise<void> {
    const res = await this._fetch(this.drawingTemplateUrl(toolName, name), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...this.buildHeaders(),
      },
      body: JSON.stringify(template),
    })
    if (!res.ok) {
      throw new Error(`HttpStorageAdapter.saveDrawingTemplate failed: ${res.status} ${res.statusText}`)
    }
  }

  async deleteDrawingTemplate(toolName: string, name: string): Promise<void> {
    const res = await this._fetch(this.drawingTemplateUrl(toolName, name), {
      method: 'DELETE',
      headers: this.buildHeaders(),
    })
    if (!res.ok && res.status !== 404) {
      throw new Error(`HttpStorageAdapter.deleteDrawingTemplate failed: ${res.status} ${res.statusText}`)
    }
  }
}
