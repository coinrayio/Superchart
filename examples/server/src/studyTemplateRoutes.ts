/**
 * HTTP routes implementing the Superchart study-template REST contract
 * (Ticket 4 of PERSISTENCE_ROADMAP.md). Lives at `/study-templates` —
 * sibling to the chart-state routes.
 *
 *   GET    /study-templates                    → 200 [{ name, indicatorName, system?, savedAt? }]
 *   GET    /study-templates?indicatorName=RSI  → filtered list
 *   GET    /study-templates/:name              → 200 StudyTemplate | 404
 *   PUT    /study-templates/:name              → 204 | 403 (system name)
 *   DELETE /study-templates/:name              → 204 | 403 (system name) | 404
 */

import type { IncomingMessage, ServerResponse } from 'http'
import {
  listStudyTemplates,
  loadStudyTemplate,
  saveStudyTemplate,
  deleteStudyTemplate,
  type StudyTemplate,
} from './db.js'

const ROUTE_PREFIX = '/study-templates'

function setCors(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
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

export async function handleStudyTemplateRequest(
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
      const indicatorName = url.searchParams.get('indicatorName') ?? undefined
      sendJson(res, 200, listStudyTemplates(indicatorName))
      return true
    }
    sendJson(res, 405, { error: 'Method not allowed' })
    return true
  }

  // Item endpoint: /study-templates/:name
  const rawName = path.slice(ROUTE_PREFIX.length + 1)
  const name = decodeURIComponent(rawName)
  if (!name) {
    sendJson(res, 400, { error: 'Missing name' })
    return true
  }

  if (req.method === 'GET') {
    const tpl = loadStudyTemplate(name)
    if (!tpl) {
      sendJson(res, 404, { error: 'Not found' })
      return true
    }
    sendJson(res, 200, tpl)
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
    const payload = body as Partial<StudyTemplate> | null
    if (!payload || typeof payload !== 'object' || !payload.indicatorName) {
      sendJson(res, 400, { error: 'Body must include indicatorName' })
      return true
    }
    const result = saveStudyTemplate(name, {
      name,
      indicatorName: payload.indicatorName,
      calcParams: payload.calcParams,
      settings: payload.settings,
      styles: payload.styles,
    })
    if (!result.ok) {
      sendJson(res, 403, { error: 'Cannot overwrite system study template' })
      return true
    }
    res.statusCode = 204
    res.end()
    return true
  }

  if (req.method === 'DELETE') {
    const result = deleteStudyTemplate(name)
    if (!result.ok) {
      sendJson(res, 403, { error: 'Cannot delete system study template' })
      return true
    }
    if (!result.existed) {
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
