/**
 * Key Event Store - Keyboard event management
 *
 * Handles keyboard shortcuts and events for the chart.
 */

import type { Chart } from 'klinecharts'
import {
  instanceApi,
  theme,
  fullScreen,
  rootElementId,
  setScreenshotUrl,
} from './chartStore'
import { showOverlaySetting } from './overlaySettingStore'

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

// Control/Meta key state
export const [ctrlKeyedDown, setCtrlKeyedDown, subscribeCtrlKeyedDown] = createSignal(false)

// Widget reference (chart or element)
export const [widgetRef, setWidgetRef, subscribeWidgetRef] = createSignal<string | Chart | HTMLElement>('')

// Timer ID for delayed operations
export const [timerId, setTimerId, subscribeTimerId] = createSignal<ReturnType<typeof setTimeout> | undefined>(undefined)

// Modal visibility callbacks (to be set by the chart component)
export interface ModalCallbacks {
  indicatorModalVisible: () => boolean
  setIndicatorModalVisible: (visible: boolean | ((prev: boolean) => boolean)) => void
  settingModalVisible: () => boolean
  setSettingModalVisible: (visible: boolean | ((prev: boolean) => boolean)) => void
  screenshotUrl: () => string
  periodModalVisible: () => boolean
  setPeriodModalVisible: (visible: boolean | ((prev: boolean) => boolean)) => void
  orderModalVisible?: () => boolean
  setOrderPanelVisible?: (visible: boolean | ((prev: boolean) => boolean)) => void
  orderPanelVisible?: () => boolean
  setPeriodInputValue?: (value: string) => void
}

let modalCallbacks: ModalCallbacks | null = null

/**
 * Set the modal callbacks for key event handling
 */
export function setModalCallbacks(callbacks: ModalCallbacks): void {
  modalCallbacks = callbacks
}

/**
 * Check if all modals are hidden except the specified one
 */
const allModalHidden = (except: 'settings' | 'indi' | 'screenshot' | 'order' | 'period'): boolean => {
  if (!modalCallbacks) return true

  const {
    indicatorModalVisible,
    settingModalVisible,
    screenshotUrl,
    periodModalVisible,
    orderModalVisible,
  } = modalCallbacks

  let value = false

  switch (except) {
    case 'settings':
      value = !indicatorModalVisible() && screenshotUrl() === '' && !(orderModalVisible?.() ?? false) && !periodModalVisible() && !showOverlaySetting()
      break
    case 'indi':
      value = !settingModalVisible() && screenshotUrl() === '' && !(orderModalVisible?.() ?? false) && !periodModalVisible() && !showOverlaySetting()
      break
    case 'screenshot':
      value = !settingModalVisible() && !indicatorModalVisible() && !(orderModalVisible?.() ?? false) && !periodModalVisible() && !showOverlaySetting()
      break
    case 'order':
      value = !settingModalVisible() && !indicatorModalVisible() && screenshotUrl() === '' && !periodModalVisible() && !showOverlaySetting()
      break
    case 'period':
      value = !settingModalVisible() && !indicatorModalVisible() && screenshotUrl() === '' && !(orderModalVisible?.() ?? false) && !showOverlaySetting()
      break
  }

  return value
}

/**
 * Take a screenshot of the chart
 */
const takeScreenshot = (): void => {
  const chart = instanceApi()
  if (!chart) return

  const url = chart.getConvertPictureUrl(true, 'jpeg', theme() === 'dark' ? '#151517' : '#ffffff')
  setScreenshotUrl(url)
}

/**
 * Toggle fullscreen mode
 */
const toggleFullscreen = (): void => {
  if (!fullScreen()) {
    const el = document.querySelector(`#${rootElementId()}`)
    if (el) {
      const enterFullScreen =
        (el as HTMLElement & { requestFullscreen?: () => Promise<void>; webkitRequestFullscreen?: () => Promise<void>; mozRequestFullScreen?: () => Promise<void>; msRequestFullscreen?: () => Promise<void> }).requestFullscreen ??
        (el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen ??
        (el as HTMLElement & { mozRequestFullScreen?: () => Promise<void> }).mozRequestFullScreen ??
        (el as HTMLElement & { msRequestFullscreen?: () => Promise<void> }).msRequestFullscreen

      if (enterFullScreen) {
        enterFullScreen.call(el)
      }
    }
  } else {
    const doc = document as Document & {
      exitFullscreen?: () => Promise<void>
      msExitFullscreen?: () => Promise<void>
      mozCancelFullScreen?: () => Promise<void>
      webkitExitFullscreen?: () => Promise<void>
    }
    const exitFullscreen =
      doc.exitFullscreen ??
      doc.msExitFullscreen ??
      doc.mozCancelFullScreen ??
      doc.webkitExitFullscreen

    if (exitFullscreen) {
      exitFullscreen.call(document)
    }
  }
}

/**
 * Document resize handler for key events (triggers chart resize)
 */
const resizeChart = (): void => {
  instanceApi()?.resize()
}

/**
 * Hook-like function for key event handling
 */
export const useKeyEvents = () => {
  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault()
      setCtrlKeyedDown(true)
    }

    if (ctrlKeyedDown()) {
      switch (event.key) {
        case 'o':
          // Reserved for future: open dialog
          break
        case 'l':
          // Toggle order list
          if (modalCallbacks?.setOrderPanelVisible && modalCallbacks?.orderPanelVisible) {
            modalCallbacks.setOrderPanelVisible(!modalCallbacks.orderPanelVisible())
            resizeChart()
          }
          break
        case 'i':
          if (allModalHidden('indi')) {
            modalCallbacks?.setIndicatorModalVisible((visible) => !visible)
          }
          break
        case 's':
          if (allModalHidden('settings')) {
            modalCallbacks?.setSettingModalVisible((visible) => !visible)
          }
          break
        case 'z':
          // TODO: undo one step
          break
        case 'y':
          // TODO: redo one step
          break
        case 'c':
          // TODO: copy selected overlay to clipboard
          break
        case 'v':
          // TODO: paste overlay from clipboard
          break
        case 'p':
          if (allModalHidden('screenshot')) {
            takeScreenshot()
          }
          break
        case 'f':
          toggleFullscreen()
          break
        case 'Backspace':
          break
      }
      return
    }

    // Number keys for quick timeframe selection
    if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(event.key) && allModalHidden('period')) {
      if (modalCallbacks && !modalCallbacks.periodModalVisible()) {
        modalCallbacks.setPeriodModalVisible(true)
      }
    } else if (event.key === ' ') {
      // Space key reserved
    } else if (event.key === 'ArrowDown') {
      // Arrow down reserved
    } else if (event.key === 'ArrowUp') {
      // Arrow up reserved
    } else if (event.key === 'Delete') {
      instanceApi()?.removeOverlay()
    } else if (event.key === 'Escape') {
      // Hide all modals
      modalCallbacks?.setPeriodModalVisible(false)
      modalCallbacks?.setPeriodInputValue?.('')
      modalCallbacks?.setSettingModalVisible(false)
      modalCallbacks?.setOrderPanelVisible?.(false)
      modalCallbacks?.setIndicatorModalVisible(false)
      setScreenshotUrl('')
    }
  }

  const handleKeyUp = (event: KeyboardEvent): void => {
    if (!event.ctrlKey && !event.metaKey) {
      setCtrlKeyedDown(false)
      event.preventDefault()
    }
  }

  return { handleKeyDown, handleKeyUp }
}

/**
 * Cleanup key event resources when leaving the chart
 */
export const cleanupKeyEvents = async (): Promise<void> => {
  const tid = timerId()
  if (tid) {
    clearTimeout(tid)
    setTimerId(undefined)
  }
}

/**
 * Key event subscriptions
 */
export const keyEventSubscriptions = {
  ctrlKeyedDown: subscribeCtrlKeyedDown,
  widgetRef: subscribeWidgetRef,
  timerId: subscribeTimerId,
}
