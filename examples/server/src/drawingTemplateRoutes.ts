/**
 * HTTP routes for drawing templates (Ticket 5 of PERSISTENCE_ROADMAP.md).
 * Lives at `/drawing-templates/:toolName` — sibling to study-templates.
 *
 *   GET    /drawing-templates/:toolName             → 200 [DrawingTemplateMeta…]
 *   GET    /drawing-templates/:toolName/:name       → 200 DrawingTemplate | 404
 *   PUT    /drawing-templates/:toolName/:name       → 204 | 403 (system) | 400
 *   DELETE /drawing-templates/:toolName/:name       → 204 | 403 (system) | 404
 */

import type { IncomingMessage, ServerResponse } from 'http'
import {
  listDrawingTemplates,
  loadDrawingTemplate,
  saveDrawingTemplate,
  deleteDrawingTemplate,
  type DrawingTemplate,
} from './db.js'

const ROUTE_PREFIX = '/drawing-templates'

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

export async function handleDrawingTemplateRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  if (!req.url || !req.method) return false
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`)
  const path = url.pathname
  if (!path.startsWith(`${ROUTE_PREFIX}/`)) {
    return false
  }

  setCors(res)

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return true
  }

  // Path shape: /drawing-templates/:toolName             → list
  //             /drawing-templates/:toolName/:name       → item
  const parts = path.slice(ROUTE_PREFIX.length + 1).split('/').map(decodeURIComponent)
  const toolName = parts[0]
  const name = parts[1]

  if (!toolName) {
    sendJson(res, 400, { error: 'Missing toolName' })
    return true
  }

  // Collection endpoint
  if (!name) {
    if (req.method === 'GET') {
      sendJson(res, 200, listDrawingTemplates(toolName))
      return true
    }
    sendJson(res, 405, { error: 'Method not allowed' })
    return true
  }

  // Item endpoint
  if (req.method === 'GET') {
    const tpl = loadDrawingTemplate(toolName, name)
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
    const payload = body as Partial<DrawingTemplate> | null
    if (!payload || typeof payload !== 'object') {
      sendJson(res, 400, { error: 'Body must be a DrawingTemplate object' })
      return true
    }
    const result = saveDrawingTemplate(toolName, name, {
      name,
      toolName,
      properties: payload.properties,
      figureStyles: payload.figureStyles,
    })
    if (!result.ok) {
      sendJson(res, 403, { error: 'Cannot overwrite system drawing template' })
      return true
    }
    res.statusCode = 204
    res.end()
    return true
  }

  if (req.method === 'DELETE') {
    const result = deleteDrawingTemplate(toolName, name)
    if (!result.ok) {
      sendJson(res, 403, { error: 'Cannot delete system drawing template' })
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
