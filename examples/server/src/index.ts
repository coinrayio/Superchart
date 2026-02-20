/**
 * Script Execution Server
 * WebSocket server that executes Pine Script for superchart indicators
 */

import { WebSocketServer, type WebSocket } from 'ws'
import { config } from 'dotenv'
import { v4 as uuidv4 } from 'uuid'
import { CoinrayClient } from './coinrayClient.js'
import { PineScriptParser } from './runtime/parser.js'
import { PineScriptExecutor } from './runtime/executor.js'
import { getAllIndicators, getIndicatorByName } from './db.js'
import type {
  WSMessage,
  CompileRequest,
  ExecuteRequest,
  ExecutePresetRequest,
  StopRequest,
  LoadHistoryRequest,
  ListIndicatorsRequest,
  GetIndicatorCodeRequest,
  CompileResponse,
  ExecuteResponse,
  DataMessage,
  HistoryMessage,
  TickMessage,
  ErrorMessage,
  Candle,
  SymbolInfo,
  Period,
  SettingValue,
} from './types.js'

// Load environment variables
config()

const PORT = parseInt(process.env.PORT || '8080')
const HOST = process.env.HOST || 'localhost'
const COINRAY_TOKEN = process.env.COINRAY_TOKEN

if (!COINRAY_TOKEN) {
  console.error('ERROR: COINRAY_TOKEN environment variable is required')
  process.exit(1)
}

// Active script executions
interface ScriptExecution {
  scriptId: string
  ws: WebSocket
  code: string
  metadata: unknown
  symbol: SymbolInfo
  period: Period
  settings: Record<string, SettingValue>
  unsubscribe: () => void
  candles: Candle[]
}

const activeScripts = new Map<string, ScriptExecution>()
const coinrayClient = new CoinrayClient()
const parser = new PineScriptParser()
const executor = new PineScriptExecutor()

// Create WebSocket server
const wss = new WebSocketServer({ port: PORT, host: HOST })

console.log(`🚀 Script Execution Server running on ws://${HOST}:${PORT}`)

wss.on('connection', (ws: WebSocket) => {
  console.log('📡 Client connected')

  ws.on('message', async (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString()) as WSMessage

      switch (message.type) {
        case 'compile':
          await handleCompile(ws, message as CompileRequest)
          break
        case 'execute':
          await handleExecute(ws, message as ExecuteRequest)
          break
        case 'stop':
          await handleStop(ws, message as StopRequest)
          break
        case 'loadHistory':
          await handleLoadHistory(ws, message as LoadHistoryRequest)
          break
        case 'listIndicators':
          await handleListIndicators(ws, message as ListIndicatorsRequest)
          break
        case 'executePreset':
          await handleExecutePreset(ws, message as ExecutePresetRequest)
          break
        case 'getIndicatorCode':
          await handleGetIndicatorCode(ws, message as GetIndicatorCodeRequest)
          break
        default:
          sendError(ws, `Unknown message type: ${message.type}`)
      }
    } catch (error) {
      console.error('Error handling message:', error)
      sendError(ws, (error as Error).message)
    }
  })

  ws.on('close', () => {
    console.log('📴 Client disconnected')
    // Clean up any scripts associated with this connection
    for (const [scriptId, execution] of activeScripts.entries()) {
      if (execution.ws === ws) {
        execution.unsubscribe()
        activeScripts.delete(scriptId)
      }
    }
  })

  ws.on('error', (error) => {
    console.error('WebSocket error:', error)
  })
})

/**
 * Handle compile request
 */
async function handleCompile(ws: WebSocket, message: CompileRequest) {
  try {
    const parsed = parser.parse(message.code)

    const response: CompileResponse = {
      type: 'compileResult',
      requestId: message.requestId,
      result: {
        success: parsed.success,
        errors: parsed.errors,
        warnings: parsed.warnings,
        metadata: parsed.metadata,
      },
    }

    ws.send(JSON.stringify(response))
  } catch (error) {
    sendError(ws, `Compilation error: ${(error as Error).message}`, message.requestId)
  }
}

/**
 * Handle execute request
 */
async function handleExecute(ws: WebSocket, message: ExecuteRequest) {
  const scriptId = uuidv4()

  try {
    // Parse the script
    const parsed = parser.parse(message.code)

    if (!parsed.success || !parsed.metadata) {
      sendError(ws, 'Script compilation failed', message.requestId, scriptId)
      return
    }

    // Fetch historical data
    console.log(`📊 Fetching history for ${message.symbol.ticker}...`)
    const candles = await coinrayClient.fetchHistory(message.symbol, message.period)

    // Execute the script on historical data
    console.log(`⚙️  Executing script (${scriptId.substring(0, 8)})...`)
    const dataPoints = executor.execute(parsed, candles, message.settings)

    // Send subscription acknowledgment
    const ackResponse: ExecuteResponse = {
      type: 'subscribeAck',
      requestId: message.requestId,
      scriptId,
      metadata: parsed.metadata,
    }
    ws.send(JSON.stringify(ackResponse))

    // Send initial data
    const dataResponse: DataMessage = {
      type: 'indicatorData',
      scriptId,
      data: dataPoints,
    }
    ws.send(JSON.stringify(dataResponse))

    // Guard flag: set to true when the script is stopped so that any
    // in-flight Coinray callbacks that arrive after unsubscription are ignored.
    let stopped = false

    // Subscribe to real-time updates.
    // subscribeKlines now fans out from a single Coinray stream per ticker+resolution,
    // so multiple indicators on the same symbol/period share one WebSocket connection.
    const handlerId = await coinrayClient.subscribeKlines(
      message.symbol,
      message.period,
      (newCandle: Candle) => {
        if (stopped) return

        // Update candles array
        const lastCandle = candles[candles.length - 1]

        if (lastCandle && newCandle.timestamp === lastCandle.timestamp) {
          // Update existing candle
          candles[candles.length - 1] = newCandle
        } else {
          // Add new candle
          candles.push(newCandle)

          // Keep max 500 candles
          if (candles.length > 500) {
            candles.shift()
          }
        }

        // Re-execute script on updated data
        try {
          const updatedData = executor.execute(parsed, candles, message.settings)
          const lastDataPoint = updatedData[updatedData.length - 1]

          // Send tick update
          const tickResponse: TickMessage = {
            type: 'indicatorTick',
            scriptId,
            data: lastDataPoint,
          }
          ws.send(JSON.stringify(tickResponse))
        } catch (error) {
          console.error(`Error executing script on tick:`, error)
        }
      }
    )

    // Store execution info
    activeScripts.set(scriptId, {
      scriptId,
      ws,
      code: message.code,
      metadata: parsed.metadata,
      symbol: message.symbol,
      period: message.period,
      settings: message.settings ?? {},
      unsubscribe: () => {
        stopped = true
        // removeTickHandler only closes the Coinray stream when this was the last handler
        return coinrayClient.removeTickHandler(handlerId)
      },
      candles,
    })

    console.log(`✅ Script ${scriptId.substring(0, 8)} executing successfully`)
  } catch (error) {
    console.error('Error executing script:', error)
    sendError(ws, `Execution error: ${(error as Error).message}`, message.requestId, scriptId)
  }
}

/**
 * Handle stop request
 */
async function handleStop(ws: WebSocket, message: StopRequest) {
  const execution = activeScripts.get(message.scriptId)

  if (execution) {
    execution.unsubscribe()
    activeScripts.delete(message.scriptId)
    console.log(`🛑 Stopped script ${message.scriptId.substring(0, 8)}`)
  }

  ws.send(JSON.stringify({
    type: 'stopAck',
    requestId: message.requestId,
    scriptId: message.scriptId,
  }))
}

/**
 * Handle loadHistory request — fetch older candles and compute indicator data for them
 */
async function handleLoadHistory(ws: WebSocket, message: LoadHistoryRequest) {
  const execution = activeScripts.get(message.scriptId)

  if (!execution) {
    sendError(ws, `Script not found: ${message.scriptId}`, message.requestId, message.scriptId)
    return
  }

  // Find the oldest candle we already have
  const oldestTimestamp = execution.candles[0]?.timestamp ?? Infinity

  // Nothing to do if we already have candles before the requested point
  if (oldestTimestamp <= message.before) {
    ws.send(JSON.stringify({ type: 'indicatorHistory', scriptId: message.scriptId, data: [] }))
    return
  }

  try {
    console.log(`📚 Loading history for script ${message.scriptId.substring(0, 8)} before ${new Date(message.before).toISOString()}`)

    // Fetch candles ending just before our current oldest
    const olderCandles = await coinrayClient.fetchHistory(
      execution.symbol,
      execution.period,
      500,
      oldestTimestamp
    )

    if (olderCandles.length === 0) {
      ws.send(JSON.stringify({ type: 'indicatorHistory', scriptId: message.scriptId, data: [] }))
      return
    }

    // Deduplicate and keep only candles strictly older than what we have
    const existingTimestamps = new Set(execution.candles.map((c: Candle) => c.timestamp))
    const newCandles = olderCandles
      .filter((c: Candle) => !existingTimestamps.has(c.timestamp))
      .sort((a: Candle, b: Candle) => a.timestamp - b.timestamp)

    if (newCandles.length === 0) {
      ws.send(JSON.stringify({ type: 'indicatorHistory', scriptId: message.scriptId, data: [] }))
      return
    }

    // Prepend the older candles so the script sees full sequential history
    execution.candles = [...newCandles, ...execution.candles]

    // Re-execute on all candles to maintain correct sequential context
    const parsed = parser.parse(execution.code)
    if (!parsed.success) {
      sendError(ws, 'Script re-parse failed during history load', message.requestId, message.scriptId)
      return
    }

    const allDataPoints = executor.execute(parsed, execution.candles, execution.settings)

    // Send ALL recalculated data points, not just the newly prepended ones.
    // The re-execution with extended history corrects warmup-period values at the
    // boundary of the previous load (e.g. the first N bars of the old data now have
    // accurate moving-average values). The client's onHistory handler merges them,
    // overwriting stale boundary values with the corrected ones.
    const historyResponse: HistoryMessage = {
      type: 'indicatorHistory',
      scriptId: message.scriptId,
      data: allDataPoints,
    }
    ws.send(JSON.stringify(historyResponse))

    console.log(`✅ History loaded: ${newCandles.length} new candles, ${allDataPoints.length} total indicator points for script ${message.scriptId.substring(0, 8)}`)
  } catch (error) {
    console.error('Error loading history:', error)
    sendError(ws, `History load error: ${(error as Error).message}`, message.requestId, message.scriptId)
  }
}

/**
 * Handle listIndicators request — return all preset indicators (without code)
 */
async function handleListIndicators(ws: WebSocket, message: ListIndicatorsRequest) {
  const indicators = getAllIndicators()

  ws.send(JSON.stringify({
    type: 'indicatorList',
    requestId: message.requestId,
    indicators: indicators.map((ind) => ({
      name: ind.name,
      shortName: ind.short_name,
      description: ind.description ?? undefined,
      category: ind.category,
      paneId: ind.pane_id,
      isOverlay: !!ind.is_overlay,
      isNew: !!ind.is_new,
      isUpdated: !!ind.is_updated,
      defaultSettings: JSON.parse(ind.default_settings) as Record<string, SettingValue>,
    })),
  }))
}

/**
 * Handle executePreset request — look up code by indicator name and execute like handleExecute
 */
async function handleExecutePreset(ws: WebSocket, message: ExecutePresetRequest) {
  const indicator = getIndicatorByName(message.indicatorName)

  if (!indicator) {
    sendError(ws, `Unknown indicator: ${message.indicatorName}`, message.requestId)
    return
  }

  // Re-use handleExecute logic with the db code substituted in
  const syntheticMessage: ExecuteRequest = {
    type: 'execute',
    requestId: message.requestId,
    code: indicator.code,
    language: 'pine',
    symbol: message.symbol,
    period: message.period,
    settings: message.settings,
  }

  await handleExecute(ws, syntheticMessage)
}

/**
 * Handle getIndicatorCode request — return the raw Pine Script code for read-only display
 */
async function handleGetIndicatorCode(ws: WebSocket, message: GetIndicatorCodeRequest) {
  const indicator = getIndicatorByName(message.indicatorName)

  if (!indicator) {
    sendError(ws, `Unknown indicator: ${message.indicatorName}`, message.requestId)
    return
  }

  ws.send(JSON.stringify({
    type: 'indicatorCode',
    requestId: message.requestId,
    indicatorName: indicator.name,
    code: indicator.code,
  }))
}

/**
 * Send error message
 */
function sendError(ws: WebSocket, error: string, requestId?: string, scriptId?: string) {
  const errorMessage: ErrorMessage = {
    type: 'error',
    requestId,
    scriptId,
    error,
  }
  ws.send(JSON.stringify(errorMessage))
}

// Catch uncaught exceptions / unhandled rejections so the server doesn't silently die
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION (server stayed alive):', error)
})

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION (server stayed alive):', reason)
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...')

  // Stop all active scripts
  for (const execution of activeScripts.values()) {
    execution.unsubscribe()
  }
  activeScripts.clear()

  // Close Coinray client
  coinrayClient.dispose()

  // Close WebSocket server
  wss.close(() => {
    console.log('✅ Server shut down gracefully')
    process.exit(0)
  })
})
