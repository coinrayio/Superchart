/**
 * DrawingBar - Toolbar for drawing tools
 *
 * Follows the pattern from coinray-chart-ui/src/widget/drawing-bar
 */

import { useState, useCallback } from 'react'
import type { OverlayCreate, OverlayMode } from 'klinecharts'

export interface DrawingBarProps {
  /** Locale for translations */
  locale?: string
  /** Called when a drawing item is clicked */
  onDrawingItemClick?: (overlay: OverlayCreate) => void
  /** Called when mode changes */
  onModeChange?: (mode: OverlayMode) => void
  /** Called when lock state changes */
  onLockChange?: (lock: boolean) => void
  /** Called when visibility changes */
  onVisibleChange?: (visible: boolean) => void
  /** Called when remove is clicked */
  onRemoveClick?: (groupId: string) => void
}

const GROUP_ID = 'drawing_tools'

// Drawing tool categories
const lineTools = [
  { key: 'horizontalStraightLine', name: 'Horizontal Line' },
  { key: 'verticalStraightLine', name: 'Vertical Line' },
  { key: 'straightLine', name: 'Trend Line' },
  { key: 'rayLine', name: 'Ray' },
  { key: 'segment', name: 'Segment' },
  { key: 'arrow', name: 'Arrow' },
]

const channelTools = [
  { key: 'parallelStraightLine', name: 'Parallel Channel' },
  { key: 'priceChannelLine', name: 'Price Channel' },
]

const shapeTools = [
  { key: 'circle', name: 'Circle' },
  { key: 'rect', name: 'Rectangle' },
  { key: 'triangle', name: 'Triangle' },
]

const fibonacciTools = [
  { key: 'fibonacciLine', name: 'Fibonacci Retracement' },
  { key: 'fibonacciSegment', name: 'Fibonacci Extension' },
  { key: 'fibonacciCircle', name: 'Fibonacci Circle' },
  { key: 'fibonacciSpiral', name: 'Fibonacci Spiral' },
  { key: 'fibonacciSpeedResistanceFan', name: 'Fibonacci Fan' },
]

const measureTools = [
  { key: 'measure', name: 'Measure' },
  { key: 'priceLabel', name: 'Price Label' },
  { key: 'dateTimeLabel', name: 'Date/Time Label' },
]

export function DrawingBar(props: DrawingBarProps) {
  const {
    onDrawingItemClick,
    onModeChange,
    onLockChange,
    onVisibleChange,
    onRemoveClick,
  } = props

  const [selectedLine, setSelectedLine] = useState('straightLine')
  const [selectedChannel, setSelectedChannel] = useState('parallelStraightLine')
  const [selectedShape, setSelectedShape] = useState('rect')
  const [selectedFibonacci, setSelectedFibonacci] = useState('fibonacciLine')
  const [selectedMeasure, setSelectedMeasure] = useState('measure')

  const [mode, setMode] = useState<OverlayMode>('normal')
  const [lock, setLock] = useState(false)
  const [visible, setVisible] = useState(true)
  const [activePopover, setActivePopover] = useState<string | null>(null)

  const handleDrawingClick = useCallback((name: string) => {
    onDrawingItemClick?.({
      groupId: GROUP_ID,
      name,
      lock,
      visible,
      mode,
    })
  }, [lock, visible, mode, onDrawingItemClick])

  const handleModeToggle = useCallback(() => {
    const nextMode: OverlayMode = mode === 'normal' ? 'weak_magnet' : mode === 'weak_magnet' ? 'strong_magnet' : 'normal'
    setMode(nextMode)
    onModeChange?.(nextMode)
  }, [mode, onModeChange])

  const handleLockToggle = useCallback(() => {
    const newLock = !lock
    setLock(newLock)
    onLockChange?.(newLock)
  }, [lock, onLockChange])

  const handleVisibleToggle = useCallback(() => {
    const newVisible = !visible
    setVisible(newVisible)
    onVisibleChange?.(newVisible)
  }, [visible, onVisibleChange])

  const renderToolGroup = (
    tools: { key: string; name: string }[],
    selected: string,
    setSelected: (key: string) => void,
    groupKey: string
  ) => (
    <div className="superchart-drawing-bar__group">
      <button
        className="superchart-drawing-bar__tool"
        onClick={() => handleDrawingClick(selected)}
        title={tools.find(t => t.key === selected)?.name}
      >
        <ToolIcon name={selected} />
      </button>
      <button
        className="superchart-drawing-bar__arrow"
        onClick={() => setActivePopover(activePopover === groupKey ? null : groupKey)}
      >
        <svg viewBox="0 0 4 6" width="6" height="8">
          <path d="M1.07,0.16C0.83,-0.05,0.43,-0.05,0.18,0.16C-0.06,0.37,-0.06,0.72,0.18,0.93L2.61,3.03L0.26,5.07C0.01,5.28,0.01,5.63,0.26,5.84C0.51,6.05,0.9,6.05,1.15,5.84L3.82,3.53C4.02,3.36,4.05,3.09,3.92,2.88C3.93,2.73,3.87,2.58,3.74,2.47L1.07,0.16Z" />
        </svg>
      </button>
      {activePopover === groupKey && (
        <ul className="superchart-drawing-bar__popover">
          {tools.map((tool) => (
            <li
              key={tool.key}
              className={selected === tool.key ? 'selected' : ''}
              onClick={() => {
                setSelected(tool.key)
                handleDrawingClick(tool.key)
                setActivePopover(null)
              }}
            >
              <ToolIcon name={tool.key} />
              <span>{tool.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  return (
    <div className="superchart-drawing-bar">
      {/* Line tools */}
      {renderToolGroup(lineTools, selectedLine, setSelectedLine, 'line')}

      {/* Channel tools */}
      {renderToolGroup(channelTools, selectedChannel, setSelectedChannel, 'channel')}

      {/* Shape tools */}
      {renderToolGroup(shapeTools, selectedShape, setSelectedShape, 'shape')}

      {/* Fibonacci tools */}
      {renderToolGroup(fibonacciTools, selectedFibonacci, setSelectedFibonacci, 'fibonacci')}

      {/* Measure tools */}
      {renderToolGroup(measureTools, selectedMeasure, setSelectedMeasure, 'measure')}

      <span className="superchart-drawing-bar__divider" />

      {/* Magnet mode */}
      <button
        className={`superchart-drawing-bar__tool ${mode !== 'normal' ? 'active' : ''}`}
        onClick={handleModeToggle}
        title={mode === 'normal' ? 'No Magnet' : mode === 'weak_magnet' ? 'Weak Magnet' : 'Strong Magnet'}
      >
        <MagnetIcon mode={mode} />
      </button>

      {/* Lock */}
      <button
        className={`superchart-drawing-bar__tool ${lock ? 'active' : ''}`}
        onClick={handleLockToggle}
        title={lock ? 'Unlock' : 'Lock'}
      >
        <LockIcon locked={lock} />
      </button>

      {/* Visibility */}
      <button
        className={`superchart-drawing-bar__tool ${!visible ? 'active' : ''}`}
        onClick={handleVisibleToggle}
        title={visible ? 'Hide' : 'Show'}
      >
        <VisibilityIcon visible={visible} />
      </button>

      <span className="superchart-drawing-bar__divider" />

      {/* Remove all */}
      <button
        className="superchart-drawing-bar__tool"
        onClick={() => onRemoveClick?.(GROUP_ID)}
        title="Remove All"
      >
        <RemoveIcon />
      </button>
    </div>
  )
}

// Simple icon components
function ToolIcon({ name }: { name: string }) {
  // Basic icons for common tools
  switch (name) {
    case 'horizontalStraightLine':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20">
          <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2" />
        </svg>
      )
    case 'verticalStraightLine':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20">
          <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth="2" />
        </svg>
      )
    case 'straightLine':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20">
          <line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" strokeWidth="2" />
        </svg>
      )
    case 'rect':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20">
          <rect x="4" y="6" width="16" height="12" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      )
    case 'circle':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20">
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      )
    case 'fibonacciLine':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20">
          <line x1="4" y1="4" x2="20" y2="4" stroke="currentColor" strokeWidth="1" />
          <line x1="4" y1="9" x2="20" y2="9" stroke="currentColor" strokeWidth="1" />
          <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="1" />
          <line x1="4" y1="15" x2="20" y2="15" stroke="currentColor" strokeWidth="1" />
          <line x1="4" y1="20" x2="20" y2="20" stroke="currentColor" strokeWidth="1" />
        </svg>
      )
    case 'measure':
      return (
        <svg viewBox="0 0 24 24" width="20" height="20">
          <rect x="4" y="4" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="4 2" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 24 24" width="20" height="20">
          <line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" strokeWidth="2" />
        </svg>
      )
  }
}

function MagnetIcon({ mode }: { mode: OverlayMode }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20">
      <path
        d="M3 7v6a9 9 0 0 0 18 0V7h-5v6a4 4 0 0 1-8 0V7z"
        stroke="currentColor"
        strokeWidth="2"
        fill={mode !== 'normal' ? 'currentColor' : 'none'}
      />
    </svg>
  )
}

function LockIcon({ locked }: { locked: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20">
      {locked ? (
        <path
          d="M19 11H5c-1.1 0-2 .9-2 2v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7c0-1.1-.9-2-2-2zm-7 8c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-8H8.9V8c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v3z"
          fill="currentColor"
        />
      ) : (
        <path
          d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z"
          fill="currentColor"
        />
      )}
    </svg>
  )
}

function VisibilityIcon({ visible }: { visible: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20">
      {visible ? (
        <path
          d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
          fill="currentColor"
        />
      ) : (
        <path
          d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 0 0 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"
          fill="currentColor"
        />
      )}
    </svg>
  )
}

function RemoveIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20">
      <path
        d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
        fill="currentColor"
      />
    </svg>
  )
}

export default DrawingBar
