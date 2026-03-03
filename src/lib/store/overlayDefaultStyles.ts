/**
 * Default Style Templates Store
 *
 * Stores per-overlay-type default properties so that new overlays inherit
 * the user's last-used style (TradingView behavior).
 */

import type { DeepPartial } from 'klinecharts'
import type { OverlayProperties } from '../types/overlay'

type Listener<T> = (value: T) => void

function createSignal<T>(initialValue: T): [
  () => T,
  (value: T | ((prev: T) => T)) => void,
  (listener: Listener<T>) => () => void,
] {
  let value = initialValue
  const listeners = new Set<Listener<T>>()

  const get = () => value
  const set = (newValue: T | ((prev: T) => T)) => {
    const nextValue = typeof newValue === 'function' ? (newValue as (prev: T) => T)(value) : newValue
    value = nextValue
    listeners.forEach(listener => listener(value))
  }
  const subscribe = (listener: Listener<T>) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  return [get, set, subscribe]
}

export type OverlayDefaultsMap = Record<string, DeepPartial<OverlayProperties>>

export const [overlayDefaults, setOverlayDefaults, subscribeOverlayDefaults] =
  createSignal<OverlayDefaultsMap>({})

/**
 * Get default properties for an overlay type.
 * Returns empty object if no defaults are set.
 */
export function getDefaultForOverlay(name: string): DeepPartial<OverlayProperties> {
  return overlayDefaults()[name] ?? {}
}

/**
 * Set default properties for an overlay type.
 * Merges with any existing defaults for that type.
 */
export function setDefaultForOverlay(name: string, props: DeepPartial<OverlayProperties>): void {
  setOverlayDefaults(prev => ({
    ...prev,
    [name]: { ...(prev[name] ?? {}), ...props },
  }))
}
