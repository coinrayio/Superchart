/**
 * Tick Store - Real-time tick data management
 *
 * Tracks the current tick data for real-time price updates.
 */

import type { KLineData, Nullable } from 'klinecharts'

// Simple observable store implementation
type Listener<T> = (value: T) => void

function createSignal<T>(initialValue: T): [() => T, (value: T | ((prev: T) => T)) => void, (listener: Listener<T>) => () => void] {
  let value = initialValue
  const listeners = new Set<Listener<T>>()

  const get = () => value

  const set = (newValue: T | ((prev: T) => T)) => {
    const nextValue = typeof newValue === 'function' ? (newValue as (prev: T) => T)(value) : newValue
    if (nextValue !== value) {
      value = nextValue
      listeners.forEach(listener => listener(value))
    }
  }

  const subscribe = (listener: Listener<T>) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  return [get, set, subscribe]
}

// Current tick data
export const [currentTick, setCurrentTick, subscribeCurrentTick] = createSignal<Nullable<KLineData>>(null)

// Tick timestamp for tracking updates
export const [tickTimestamp, setTickTimestamp, subscribeTickTimestamp] = createSignal<number | undefined>(undefined)

/**
 * Update the current tick data
 */
export function updateTick(tick: KLineData): void {
  setCurrentTick(tick)
  setTickTimestamp(Date.now())
}

/**
 * Clear tick data
 */
export function clearTick(): void {
  setCurrentTick(null)
  setTickTimestamp(undefined)
}

/**
 * Get tick subscriptions
 */
export const tickSubscriptions = {
  currentTick: subscribeCurrentTick,
  tickTimestamp: subscribeTickTimestamp,
}
