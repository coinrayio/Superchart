/**
 * WebSocket Indicator Provider
 * Connects to the script server to list and execute preset server-side indicators.
 * Code never leaves the server — clients request execution by indicator name.
 */

import type {
  IndicatorProvider,
  IndicatorDefinition,
  IndicatorSubscription,
  IndicatorSubscribeParams,
  IndicatorDataHandler,
  IndicatorTickHandler,
} from '@superchart/types/indicator'

interface WebSocketMessage {
  type: string
  requestId?: string
  [key: string]: any
}

export class WebSocketIndicatorProvider implements IndicatorProvider {
  private ws: WebSocket | null = null
  private connected = false
  private requestId = 0
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void
    reject: (error: Error) => void
  }>()
  /** Requests that arrived before the WS connection was established */
  private queuedRequests: Array<() => void> = []
  private activeSubscriptions = new Map<string, {
    onDataHandler?: IndicatorDataHandler
    onTickHandler?: IndicatorTickHandler
    onHistoryHandler?: IndicatorDataHandler
    onErrorHandler?: (error: Error) => void
    bufferedData: any[]
    bufferedTicks: any[]
    bufferedHistory: any[][]
  }>()

  constructor(private url: string) {
    this.connect()
  }

  private connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        this.connected = true
        console.log('✅ [IndicatorProvider] Connected to script server')
        // Flush any requests that arrived before the connection was ready
        const queued = this.queuedRequests.splice(0)
        for (const fn of queued) fn()
        resolve()
      }

      this.ws.onclose = () => {
        this.connected = false
        console.log('❌ [IndicatorProvider] Disconnected from script server')
        setTimeout(() => {
          if (!this.connected) {
            this.connect()
          }
        }, 3000)
      }

      this.ws.onerror = (error) => {
        console.error('[IndicatorProvider] WebSocket error:', error)
        reject(new Error('Failed to connect to script server'))
      }

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          this.handleMessage(message)
        } catch (error) {
          console.error('[IndicatorProvider] Error parsing message:', error)
        }
      }
    })
  }

  private handleMessage(message: WebSocketMessage): void {
    const { type, requestId } = message

    // Request-response pattern
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

    // Streaming subscription updates
    switch (type) {
      case 'indicatorData':
        this.handleIndicatorData(message)
        break
      case 'indicatorTick':
        this.handleIndicatorTick(message)
        break
      case 'indicatorHistory':
        this.handleIndicatorHistory(message)
        break
      case 'error':
        this.handleError(message)
        break
    }
  }

  private handleIndicatorData(message: any): void {
    const { scriptId, data } = message
    const sub = this.activeSubscriptions.get(scriptId)
    if (!sub) return
    if (sub.onDataHandler) {
      sub.onDataHandler(data)
    } else {
      sub.bufferedData.push(data)
    }
  }

  private handleIndicatorTick(message: any): void {
    const { scriptId, data } = message
    const sub = this.activeSubscriptions.get(scriptId)
    if (!sub) return
    if (sub.onTickHandler) {
      sub.onTickHandler(data)
    } else {
      sub.bufferedTicks.push(data)
    }
  }

  private handleIndicatorHistory(message: any): void {
    const { scriptId, data } = message
    const sub = this.activeSubscriptions.get(scriptId)
    if (!sub) return
    if (sub.onHistoryHandler) {
      sub.onHistoryHandler(data)
    } else {
      sub.bufferedHistory.push(data)
    }
  }

  private handleError(message: any): void {
    const { scriptId, error } = message
    const sub = this.activeSubscriptions.get(scriptId)
    if (sub?.onErrorHandler) {
      sub.onErrorHandler(new Error(error))
    } else {
      console.error('[IndicatorProvider] Script error:', error)
    }
  }

  private sendRequest(type: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const send = () => {
        if (!this.ws || !this.connected) {
          reject(new Error('[IndicatorProvider] Not connected to script server'))
          return
        }

        const id = `${type}_${++this.requestId}`
        this.pendingRequests.set(id, { resolve, reject })

        this.ws.send(JSON.stringify({ type, requestId: id, ...data }))

        setTimeout(() => {
          if (this.pendingRequests.has(id)) {
            this.pendingRequests.delete(id)
            reject(new Error('Request timeout'))
          }
        }, 30000)
      }

      if (this.connected) {
        send()
      } else {
        this.queuedRequests.push(send)
      }
    })
  }

  async getAvailableIndicators(): Promise<IndicatorDefinition[]> {
    const response = await this.sendRequest('listIndicators', {})
    return (response.indicators ?? []).map((ind: any): IndicatorDefinition => ({
      name: ind.name,
      shortName: ind.shortName,
      description: ind.description,
      category: ind.category,
      paneId: ind.paneId,
      isOverlay: !!ind.isOverlay,
      defaultSettings: ind.defaultSettings ?? {},
      isNew: !!ind.isNew,
      isUpdated: !!ind.isUpdated,
    }))
  }

  async subscribe(params: IndicatorSubscribeParams): Promise<IndicatorSubscription> {
    const response = await this.sendRequest('executePreset', {
      indicatorName: params.indicatorName,
      symbol: params.symbol,
      period: params.period,
      settings: params.settings ?? {},
    })

    const scriptId = response.scriptId

    const handlers: {
      onDataHandler?: IndicatorDataHandler
      onTickHandler?: IndicatorTickHandler
      onHistoryHandler?: IndicatorDataHandler
      onErrorHandler?: (error: Error) => void
      bufferedData: any[]
      bufferedTicks: any[]
      bufferedHistory: any[][]
    } = {
      bufferedData: [],
      bufferedTicks: [],
      bufferedHistory: [],
    }

    this.activeSubscriptions.set(scriptId, handlers)

    const subscription: IndicatorSubscription = {
      indicatorId: scriptId,
      metadata: response.metadata,

      onData(handler: IndicatorDataHandler) {
        handlers.onDataHandler = handler
        for (const data of handlers.bufferedData) handler(data)
        handlers.bufferedData = []
      },

      onTick(handler: IndicatorTickHandler) {
        handlers.onTickHandler = handler
        for (const data of handlers.bufferedTicks) handler(data)
        handlers.bufferedTicks = []
      },

      onHistory(handler: IndicatorDataHandler) {
        handlers.onHistoryHandler = handler
        for (const data of handlers.bufferedHistory) handler(data)
        handlers.bufferedHistory = []
      },

      onError(handler: (error: Error) => void) {
        handlers.onErrorHandler = handler
      },
    }

    return subscription
  }

  async updateSettings(indicatorId: string, _settings: Record<string, any>): Promise<void> {
    // Stop the current subscription; caller is responsible for re-subscribing
    await this.unsubscribe(indicatorId)
  }

  async unsubscribe(indicatorId: string): Promise<void> {
    if (this.ws && this.connected) {
      this.ws.send(JSON.stringify({ type: 'stop', scriptId: indicatorId }))
    }
    this.activeSubscriptions.delete(indicatorId)
  }

  /**
   * Request historical indicator data for all active subscriptions.
   * Mirrors WebSocketScriptProvider.loadHistoryBefore — call this alongside it.
   */
  loadHistoryBefore(before: number): void {
    for (const [scriptId] of this.activeSubscriptions) {
      if (this.ws && this.connected) {
        this.ws.send(JSON.stringify({ type: 'loadHistory', scriptId, before }))
      }
    }
  }

  /**
   * Fetch the Pine Script source code for a preset indicator (read-only display).
   */
  async getIndicatorCode(indicatorName: string): Promise<string> {
    const response = await this.sendRequest('getIndicatorCode', { indicatorName })
    return response.code as string
  }

  dispose(): void {
    for (const indicatorId of this.activeSubscriptions.keys()) {
      this.unsubscribe(indicatorId).catch(console.error)
    }
    this.activeSubscriptions.clear()

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}
