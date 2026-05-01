/**
 * HTTP routes implementing the Superchart chart-state REST contract.
 *
 *   GET    /chart-state           → 200 [{ key, revision, savedAt, ... }]
 *   GET    /chart-state/:key      → 200 { state, revision } | 404
 *   PUT    /chart-state/:key      → 200 { revision }
 *                                    | 409 { remoteState, remoteRevision }
 *   DELETE /chart-state/:key      → 204 | 404
 *
 * See PERSISTENCE_ROADMAP.md for the full contract.
 */

import type { IncomingMessage, ServerResponse } from 'http'
import {
  loadChartState,
  saveChartState,
  deleteChartState,
  listChartStates,
} from './db.js'

const ROUTE_PREFIX = '/chart-state'

function setCors(res: ServerResponse): void {
  // Storybook runs on 6007; examples/client on 5173. In a production deployment
  // narrow this to the consuming origin(s).
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, If-Match, Authorization')
  res.setHeader('Access-Control-Expose-Headers', 'ETag')
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8')
      if (!raw) return resolve(null)
      try {
        resolve(JSON.parse(raw))
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })
}

/**
 * Returns true if the request was handled (matched a chart-state route).
 * Returns false otherwise so the caller can fall through to other handlers
 * or respond with 404.
 */
export async function handleChartStateRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  if (!req.url || !req.method) return false

  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`)
  const path = url.pathname

  if (path !== ROUTE_PREFIX && !path.startsWith(`${ROUTE_PREFIX}/`)) {
    return false
  }

  setCors(res)

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return true
  }

  // Collection endpoint
  if (path === ROUTE_PREFIX) {
    if (req.method === 'GET') {
      const prefix = url.searchParams.get('prefix') ?? undefined
      sendJson(res, 200, listChartStates(prefix))
      return true
    }
    sendJson(res, 405, { error: 'Method not allowed' })
    return true
  }

  // Item endpoint: /chart-state/:key
  const rawKey = path.slice(ROUTE_PREFIX.length + 1) // strip leading "/"
  const key = decodeURIComponent(rawKey)
  if (!key) {
    sendJson(res, 400, { error: 'Missing key' })
    return true
  }

  if (req.method === 'GET') {
    const record = loadChartState(key)
    if (!record) {
      sendJson(res, 404, { error: 'Not found' })
      return true
    }
    sendJson(res, 200, record)
    return true
  }

  if (req.method === 'PUT') {
    let body: unknown
    try {
      body = await readJsonBody(req)
    } catch {
      sendJson(res, 400, { error: 'Invalid JSON' })
      return true
    }
    const payload = body as { state?: unknown } | null
    if (!payload || typeof payload !== 'object' || !('state' in payload)) {
      sendJson(res, 400, { error: 'Body must be { state }' })
      return true
    }

    const ifMatchHeader = req.headers['if-match']
    const expectedRevision =
      typeof ifMatchHeader === 'string' && ifMatchHeader !== ''
        ? Number(ifMatchHeader)
        : undefined
    if (ifMatchHeader !== undefined && expectedRevision !== undefined && Number.isNaN(expectedRevision)) {
      sendJson(res, 400, { error: 'If-Match must be an integer revision' })
      return true
    }

    const state = payload.state as { symbol?: string; period?: string }
    const result = saveChartState(
      key,
      state,
      expectedRevision,
      state?.symbol,
      state?.period
    )

    if (!result.ok) {
      sendJson(res, 409, {
        remoteState: result.current.state,
        remoteRevision: result.current.revision,
      })
      return true
    }
    sendJson(res, 200, { revision: result.revision })
    return true
  }

  if (req.method === 'DELETE') {
    const removed = deleteChartState(key)
    if (!removed) {
      res.statusCode = 404
      res.end()
      return true
    }
    res.statusCode = 204
    res.end()
    return true
  }

  sendJson(res, 405, { error: 'Method not allowed' })
  return true
}
