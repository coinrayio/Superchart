/**
 * WebSocket Script Provider - Connects to the script execution server
 */

import type {
  ScriptProvider,
  ScriptCompileResult,
  ScriptExecuteParams,
} from '@superchart/types/script'
import type { IndicatorSubscription, IndicatorDataHandler, IndicatorTickHandler } from '@superchart/types/indicator'

interface WebSocketMessage {
  type: string
  requestId?: string
  [key: string]: any
}

export class WebSocketScriptProvider implements ScriptProvider {
  private ws: WebSocket | null = null
  private connected = false
  private requestId = 0
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void
    reject: (error: Error) => void
  }>()
  private activeSubscriptions = new Map<string, {
    onDataHandler?: IndicatorDataHandler
    onTickHandler?: IndicatorTickHandler
    onErrorHandler?: (error: Error) => void
    bufferedData: any[]
    bufferedTicks: any[]
  }>()

  constructor(private url: string) {
    this.connect()
  }

  private connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        this.connected = true
        console.log('✅ Connected to script server')
        resolve()
      }

      this.ws.onclose = () => {
        this.connected = false
        console.log('❌ Disconnected from script server')

        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          if (!this.connected) {
            this.connect()
          }
        }, 3000)
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        reject(new Error('Failed to connect to script server'))
      }

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          this.handleMessage(message)
        } catch (error) {
          console.error('Error parsing message:', error)
        }
      }
    })
  }

  private handleMessage(message: WebSocketMessage): void {
    const { type, requestId } = message

    // Handle request-response pattern
    if (requestId && this.pendingRequests.has(requestId)) {
      const { resolve, reject } = this.pendingRequests.get(requestId)!
      this.pendingRequests.delete(requestId)

      if (type === 'error') {
        reject(new Error(message.error))
      } else {
        resolve(message)
      }
      return
    }

    // Handle subscription updates
    switch (type) {
      case 'indicatorData':
        this.handleIndicatorData(message)
        break

      case 'indicatorTick':
        this.handleIndicatorTick(message)
        break

      case 'error':
        this.handleError(message)
        break
    }
  }

  private handleIndicatorData(message: any): void {
    const { scriptId, data } = message
    const subscription = this.activeSubscriptions.get(scriptId)
    if (!subscription) return
    if (subscription.onDataHandler) {
      subscription.onDataHandler(data)
    } else {
      // Buffer data until handler is registered (fixes race condition)
      subscription.bufferedData.push(data)
    }
  }

  private handleIndicatorTick(message: any): void {
    const { scriptId, data } = message
    const subscription = this.activeSubscriptions.get(scriptId)
    if (!subscription) return
    if (subscription.onTickHandler) {
      subscription.onTickHandler(data)
    } else {
      subscription.bufferedTicks.push(data)
    }
  }

  private handleError(message: any): void {
    const { scriptId, error } = message
    const subscription = this.activeSubscriptions.get(scriptId)
    if (subscription?.onErrorHandler) {
      subscription.onErrorHandler(new Error(error))
    } else {
      console.error('Script error:', error)
    }
  }

  private sendRequest(type: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || !this.connected) {
        reject(new Error('Not connected to script server'))
        return
      }

      const requestId = `${type}_${++this.requestId}`
      this.pendingRequests.set(requestId, { resolve, reject })

      this.ws.send(JSON.stringify({
        type,
        requestId,
        ...data,
      }))

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId)
          reject(new Error('Request timeout'))
        }
      }, 30000)
    })
  }

  async compile(code: string, language: string): Promise<ScriptCompileResult> {
    const response = await this.sendRequest('compile', { code, language })

    return {
      success: response.result?.success ?? false,
      errors: response.result?.errors ?? [],
      metadata: response.result?.metadata,
    }
  }

  async executeAsIndicator(params: ScriptExecuteParams): Promise<IndicatorSubscription> {
    const response = await this.sendRequest('execute', {
      code: params.code,
      language: params.language,
      symbol: params.symbol,
      period: params.period,
      settings: params.settings || {},
    })

    const scriptId = response.scriptId

    // Initialize subscription handlers storage with buffers for race condition
    const subscriptionHandlers: {
      onDataHandler?: IndicatorDataHandler
      onTickHandler?: IndicatorTickHandler
      onErrorHandler?: (error: Error) => void
      bufferedData: any[]
      bufferedTicks: any[]
    } = {
      bufferedData: [],
      bufferedTicks: [],
    }

    this.activeSubscriptions.set(scriptId, subscriptionHandlers)

    // Create subscription object
    const subscription: IndicatorSubscription = {
      indicatorId: scriptId,
      metadata: response.metadata,

      // onData accepts a handler function and replays any buffered data
      onData(handler: IndicatorDataHandler) {
        subscriptionHandlers.onDataHandler = handler
        // Replay any data that arrived before handler was registered
        for (const data of subscriptionHandlers.bufferedData) {
          handler(data)
        }
        subscriptionHandlers.bufferedData = []
      },

      // onTick accepts a handler function and replays any buffered ticks
      onTick(handler: IndicatorTickHandler) {
        subscriptionHandlers.onTickHandler = handler
        for (const data of subscriptionHandlers.bufferedTicks) {
          handler(data)
        }
        subscriptionHandlers.bufferedTicks = []
      },

      // onError is optional
      onError(handler: (error: Error) => void) {
        subscriptionHandlers.onErrorHandler = handler
      },
    }

    return subscription
  }

  async stop(scriptId: string): Promise<void> {
    await this.sendRequest('stop', { scriptId })
    this.activeSubscriptions.delete(scriptId)
  }

  dispose(): void {
    for (const scriptId of this.activeSubscriptions.keys()) {
      this.stop(scriptId).catch(console.error)
    }
    this.activeSubscriptions.clear()

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}
