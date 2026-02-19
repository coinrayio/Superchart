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
import type {
  WSMessage,
  CompileRequest,
  ExecuteRequest,
  StopRequest,
  CompileResponse,
  ExecuteResponse,
  DataMessage,
  TickMessage,
  ErrorMessage,
  IndicatorDataPoint,
  Candle,
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

    // Subscribe to real-time updates
    const subscriptionKey = await coinrayClient.subscribeKlines(
      message.symbol,
      message.period,
      (newCandle: Candle) => {
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
      unsubscribe: () => coinrayClient.unsubscribe(subscriptionKey),
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
