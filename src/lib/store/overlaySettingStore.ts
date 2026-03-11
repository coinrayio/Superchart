/**
 * Overlay Setting Store - Overlay popup and settings management
 *
 * Manages the state for overlay context menus and settings panels.
 */

import type { Overlay, OverlayEvent } from 'klinecharts'
import { getScreenSize } from '../helpers'
import type { TimeframeVisibility } from '../types/overlay'

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

// Overlay type definition
export type OverlayType =
  | 'point'
  | 'line'
  | 'rect'
  | 'polygon'
  | 'circle'
  | 'arc'
  | 'text'
  | 'horizontalStraightLine'
  | 'horizontalRayLine'
  | 'horizontalSegment'
  | 'verticalStraightLine'
  | 'verticalRayLine'
  | 'verticalSegment'
  | 'straightLine'
  | 'rayLine'
  | 'segment'
  | 'arrow'
  | 'priceLine'

// Exit type (for order-related overlays)
export type ExitType = 'tp' | 'sl' | 'position' | 'sell'

// Other context info for popup
export interface OverlayContextInfo {
  exitType?: ExitType
  overlayType?: OverlayType
}

// Popup visibility and position
export const [showOverlayPopup, setShowOverlayPopup, subscribeShowOverlayPopup] = createSignal(false)
export const [popupTop, setPopupTop, subscribePopupTop] = createSignal(0)
export const [popupLeft, setPopupLeft, subscribePopupLeft] = createSignal(0)
export const [popupOverlay, setPopupOverlay, subscribePopupOverlay] = createSignal<Overlay | undefined>(undefined)
export const [popupOtherInfo, setPopupOtherInfo, subscribePopupOtherInfo] = createSignal<OverlayContextInfo | undefined>(undefined)

// Settings panel visibility
export const [showPositionSetting, setShowPositionSetting, subscribeShowPositionSetting] = createSignal(false)
export const [showOverlaySetting, setShowOverlaySetting, subscribeShowOverlaySetting] = createSignal(false)
export const [showSellSetting, setShowSellSetting, subscribeShowSellSetting] = createSignal(false)
export const [showTpSetting, setShowTpSetting, subscribeShowTpSetting] = createSignal(false)
export const [showSlSetting, setShowSlSetting, subscribeShowSlSetting] = createSignal(false)

/**
 * Get the type of the current popup overlay
 */
export const getOverlayType = (): string => {
  return popupOverlay()?.name ?? 'Object'
}

/**
 * Hook-like function for overlay settings management
 */
export const useOverlaySettings = () => {
  const openPopup = (event: OverlayEvent<unknown>, others?: OverlayContextInfo) => {
    const screenSize = getScreenSize()
    // Position popup so it stays visible on screen
    setPopupTop(screenSize.y - (event.pageY ?? 0) > 200 ? (event.pageY ?? 0) : screenSize.y - 200)
    setPopupLeft(screenSize.x - (event.pageX ?? 0) > 200 ? (event.pageX ?? 0) : screenSize.x - 200)
    setPopupOverlay(event.overlay)
    setPopupOtherInfo(others)
    setShowOverlayPopup(true)
  }

  const closePopup = () => {
    setShowOverlayPopup(false)
  }

  return { openPopup, closePopup }
}

/**
 * Close all setting panels
 */
export function closeAllSettingPanels(): void {
  setShowOverlayPopup(false)
  setShowPositionSetting(false)
  setShowOverlaySetting(false)
  setShowSellSetting(false)
  setShowTpSetting(false)
  setShowSlSetting(false)
}

// ── Overlay Timeframe Visibility Store (runtime) ──
// Keeps visibility configs in-memory for fast access during period changes

const visibilityMap = new Map<string, TimeframeVisibility>()

export function getOverlayTimeframeVisibility(id: string): TimeframeVisibility | undefined {
  return visibilityMap.get(id)
}

export function setOverlayTimeframeVisibility(id: string, visibility: TimeframeVisibility): void {
  visibilityMap.set(id, visibility)
}

export function deleteOverlayTimeframeVisibility(id: string): void {
  visibilityMap.delete(id)
}

export function getAllOverlayTimeframeVisibility(): Map<string, TimeframeVisibility> {
  return visibilityMap
}

/**
 * Get overlay setting subscriptions
 */
export const overlaySettingSubscriptions = {
  showOverlayPopup: subscribeShowOverlayPopup,
  popupTop: subscribePopupTop,
  popupLeft: subscribePopupLeft,
  popupOverlay: subscribePopupOverlay,
  popupOtherInfo: subscribePopupOtherInfo,
  showPositionSetting: subscribeShowPositionSetting,
  showOverlaySetting: subscribeShowOverlaySetting,
  showSellSetting: subscribeShowSellSetting,
  showTpSetting: subscribeShowTpSetting,
  showSlSetting: subscribeShowSlSetting,
}
