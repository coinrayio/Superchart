/**
 * Drawing Bar Widget — TradingView-style vertical toolbar
 *
 * Group layout (top → bottom):
 *   1. Cursor tools         (cursor, dot, arrow, brush, eraser)
 *   2. Trendline Tools      (lines, rays, channels, …)
 *   3. Gann & Fibonacci     (fib tools, pitchfork, gann, …)
 *   4. Patterns             (elliott waves, patterns, …)
 *   5. Geometric Shapes     (circle, rect, triangle, …)
 *   6. Annotations          (text, note, flag, …)
 *   7. Icons / Emoji        (emoji markers — PNG icons wired later)
 *   ─── separator ───
 *   8. Magnet               (weak / strong — dropdown)
 *   9. Hide All Drawings    (text-only dropdown)
 *   ─── separator ───
 *  10. Measure              (standalone)
 *  11. Zoom In              (standalone)
 *  12. Keep Drawing         (standalone toggle)
 *  13. Lock All Drawings    (standalone toggle)
 *  14. Delete All Objects   (standalone)
 */

import { useState, useMemo, useCallback } from 'react'
import type { OverlayCreate, OverlayMode } from 'klinecharts'
import { List } from '../../component'
import {
  type DrawingToolItem,
  createCursorOptions,
  createTrendlineOptions,
  createGannFibOptions,
  createPatternOptions,
  createShapeOptions,
  createAnnotationOptions,
  createEmojiOptions,
  createMagnetOptions,
  createHideAllOptions,
  Icon,
} from './icons'

export interface DrawingBarProps {
  locale: string
  onDrawingItemClick: (value: OverlayCreate) => void
  onModeChange: (mode: string) => void
  onLockChange: (lock: boolean) => void
  onVisibleChange: (visible: boolean) => void
  onRemoveClick: (groupId: string) => void
  /** Called when the user resets to cursor/crosshair mode */
  onCursorReset?: () => void
  /** Called when Measure tool is clicked */
  onMeasureClick?: () => void
  /** Called when Zoom In is clicked */
  onZoomClick?: () => void
}

const GROUP_ID = 'drawing_tools'

// ── Chevron SVG (shared between all group dropdown arrows) ─────────────────
const ChevronSvg = ({ open }: { open: boolean }) => (
  <svg className={open ? 'rotate' : ''} viewBox="0 0 4 6">
    <path
      d="M1.07298,0.159458C0.827521,-0.0531526,0.429553,-0.0531526,0.184094,0.159458C-0.0613648,0.372068,-0.0613648,0.716778,0.184094,0.929388L2.61275,3.03303L0.260362,5.07061C0.0149035,5.28322,0.0149035,5.62793,0.260362,5.84054C0.505822,6.05315,0.903789,6.05315,1.14925,5.84054L3.81591,3.53075C4.01812,3.3556,4.05374,3.0908,3.92279,2.88406C3.93219,2.73496,3.87113,2.58315,3.73964,2.46925L1.07298,0.159458Z"
      stroke="none"
      strokeOpacity="0"
    />
  </svg>
)

// ── Tool group component ───────────────────────────────────────────────────
interface ToolGroupProps {
  groupKey: string
  /** Icon name for the main group button */
  activeIconKey: string
  items: DrawingToolItem[]
  popoverKey: string
  lock: boolean
  mode: string
  visible: boolean
  onGroupClick: () => void
  onChevronClick: () => void
  onItemClick: (item: DrawingToolItem) => void
  /** Render icon-only items in the popover (false → also show text label) */
  textOnly?: boolean
}

function ToolGroup({
  groupKey,
  activeIconKey,
  items,
  popoverKey,
  onGroupClick,
  onChevronClick,
  onItemClick,
  textOnly = false,
}: ToolGroupProps) {
  const isOpen = popoverKey === groupKey
  return (
    <div className="item" tabIndex={0} onBlur={() => !isOpen && undefined}>
      <span style={{ width: 32, height: 32 }} onClick={onGroupClick}>
        <Icon name={activeIconKey} />
      </span>
      <div className="icon-arrow" onClick={onChevronClick}>
        <ChevronSvg open={isOpen} />
      </div>
      {isOpen && (
        <List className="list">
          {items.map((item, idx) => (
            <li key={`${item.key}-${idx}`} onClick={() => onItemClick(item)}>
              {!textOnly && <Icon name={item.iconKey ?? item.key} />}
              <span style={{ paddingLeft: textOnly ? 0 : 8 }}>{item.text}</span>
            </li>
          ))}
        </List>
      )}
    </div>
  )
}

// ── Main DrawingBar component ─────────────────────────────────────────────
export function DrawingBar({
  locale,
  onDrawingItemClick,
  onModeChange,
  onLockChange,
  onVisibleChange,
  onRemoveClick,
  onCursorReset,
  onMeasureClick,
  onZoomClick,
}: DrawingBarProps) {
  // Active icon for each tool group (shown on the group button)
  const [cursorIconKey,     setCursorIconKey]     = useState('cursor')
  const [trendlineIconKey,  setTrendlineIconKey]  = useState('horizontalStraightLine')
  const [gannFibIconKey,    setGannFibIconKey]    = useState('fibonacciLine')
  const [patternIconKey,    setPatternIconKey]    = useState('xabcd')
  const [shapeIconKey,      setShapeIconKey]      = useState('circle')
  const [annotationIconKey, setAnnotationIconKey] = useState('lineToolText')
  const [emojiIconKey,      setEmojiIconKey]      = useState('emojiGroup')
  const [magnetIconKey,     setMagnetIconKey]     = useState('weak_magnet')

  // Toolbar state
  const [mode,         setMode]         = useState('normal')
  const [lock,         setLock]         = useState(false)
  const [visible,      setVisible]      = useState(true)
  const [keepDrawing,  setKeepDrawing]  = useState(false)
  const [popoverKey,   setPopoverKey]   = useState('')

  const togglePopover = useCallback((key: string) => {
    setPopoverKey(prev => prev === key ? '' : key)
  }, [])

  const closePopover = useCallback(() => setPopoverKey(''), [])

  // Memoised option lists
  const cursorItems     = useMemo(() => createCursorOptions(locale),     [locale])
  const trendlineItems  = useMemo(() => createTrendlineOptions(locale),  [locale])
  const gannFibItems    = useMemo(() => createGannFibOptions(locale),    [locale])
  const patternItems    = useMemo(() => createPatternOptions(locale),    [locale])
  const shapeItems      = useMemo(() => createShapeOptions(locale),      [locale])
  const annotationItems = useMemo(() => createAnnotationOptions(locale), [locale])
  const emojiItems      = useMemo(() => createEmojiOptions(locale),      [locale])
  const magnetItems     = useMemo(() => createMagnetOptions(locale),     [locale])
  const hideAllItems    = useMemo(() => createHideAllOptions(locale),    [locale])

  // ── Item click handlers ────────────────────────────────────────────────
  const handleOverlayItem = useCallback(
    (item: DrawingToolItem, setIconKey: (k: string) => void) => {
      closePopover()
      if (item.isCursorMode) {
        setIconKey('cursor')
        onCursorReset?.()
        return
      }
      if (item.isEraserMode) {
        setIconKey('eraser')
        // eraser mode — wire up via onCursorReset or a dedicated prop later
        return
      }
      setIconKey(item.iconKey ?? item.key)
      onDrawingItemClick({
        name: item.key,
        groupId: GROUP_ID,
        visible,
        lock,
        mode: mode as OverlayMode,
        ...(item.extendData != null ? { extendData: item.extendData } : {}),
      })
    },
    [closePopover, lock, mode, onCursorReset, onDrawingItemClick, visible]
  )

  const handleMagnetItem = useCallback(
    (item: DrawingToolItem) => {
      closePopover()
      setMagnetIconKey(item.key)
      const nextMode = mode !== 'normal' ? 'normal' : item.key
      setMode(nextMode)
      onModeChange(nextMode)
    },
    [closePopover, mode, onModeChange]
  )

  const handleHideAllItem = useCallback(
    (item: DrawingToolItem) => {
      closePopover()
      if (item.key === 'show_all' || item.key === 'show_labels') {
        setVisible(true)
        onVisibleChange(true)
      } else {
        setVisible(false)
        onVisibleChange(false)
      }
    },
    [closePopover, onVisibleChange]
  )

  // ── Shared group-click: re-use the last selected overlay ───────────────
  const reDrawLast = useCallback(
    (overlayKey: string) => {
      onDrawingItemClick({
        name: overlayKey,
        groupId: GROUP_ID,
        visible,
        lock,
        mode: mode as OverlayMode,
      })
    },
    [lock, mode, onDrawingItemClick, visible]
  )

  return (
    <div className="superchart-drawing-bar" onBlur={() => closePopover()}>

      {/* ── Group 1: Cursor tools ──────────────────────────────────────── */}
      <ToolGroup
        groupKey="cursor"
        activeIconKey={cursorIconKey}
        items={cursorItems}
        popoverKey={popoverKey}
        lock={lock} mode={mode} visible={visible}
        onGroupClick={() => {
          if (cursorIconKey === 'cursor') {
            onCursorReset?.()
          } else {
            // Cursor group: clicking the group icon toggles cursor reset
            onCursorReset?.()
            setCursorIconKey('cursor')
          }
        }}
        onChevronClick={() => togglePopover('cursor')}
        onItemClick={(item) => handleOverlayItem(item, setCursorIconKey)}
      />

      {/* ── Group 2: Trendline tools ───────────────────────────────────── */}
      <ToolGroup
        groupKey="trendline"
        activeIconKey={trendlineIconKey}
        items={trendlineItems}
        popoverKey={popoverKey}
        lock={lock} mode={mode} visible={visible}
        onGroupClick={() => reDrawLast(trendlineIconKey)}
        onChevronClick={() => togglePopover('trendline')}
        onItemClick={(item) => handleOverlayItem(item, setTrendlineIconKey)}
      />

      {/* ── Group 3: Gann & Fibonacci ──────────────────────────────────── */}
      <ToolGroup
        groupKey="gannFib"
        activeIconKey={gannFibIconKey}
        items={gannFibItems}
        popoverKey={popoverKey}
        lock={lock} mode={mode} visible={visible}
        onGroupClick={() => reDrawLast(gannFibIconKey)}
        onChevronClick={() => togglePopover('gannFib')}
        onItemClick={(item) => handleOverlayItem(item, setGannFibIconKey)}
      />

      {/* ── Group 4: Patterns ─────────────────────────────────────────── */}
      <ToolGroup
        groupKey="patterns"
        activeIconKey={patternIconKey}
        items={patternItems}
        popoverKey={popoverKey}
        lock={lock} mode={mode} visible={visible}
        onGroupClick={() => reDrawLast(patternIconKey)}
        onChevronClick={() => togglePopover('patterns')}
        onItemClick={(item) => handleOverlayItem(item, setPatternIconKey)}
      />

      {/* ── Group 5: Geometric shapes ──────────────────────────────────── */}
      <ToolGroup
        groupKey="shapes"
        activeIconKey={shapeIconKey}
        items={shapeItems}
        popoverKey={popoverKey}
        lock={lock} mode={mode} visible={visible}
        onGroupClick={() => reDrawLast(shapeIconKey)}
        onChevronClick={() => togglePopover('shapes')}
        onItemClick={(item) => handleOverlayItem(item, setShapeIconKey)}
      />

      {/* ── Group 6: Annotations ──────────────────────────────────────── */}
      <ToolGroup
        groupKey="annotation"
        activeIconKey={annotationIconKey}
        items={annotationItems}
        popoverKey={popoverKey}
        lock={lock} mode={mode} visible={visible}
        onGroupClick={() => reDrawLast('horizontalStraightLine')}
        onChevronClick={() => togglePopover('annotation')}
        onItemClick={(item) => handleOverlayItem(item, setAnnotationIconKey)}
      />

      {/* ── Group 7: Emoji / icon markers ─────────────────────────────── */}
      <ToolGroup
        groupKey="emoji"
        activeIconKey={emojiIconKey}
        items={emojiItems}
        popoverKey={popoverKey}
        lock={lock} mode={mode} visible={visible}
        textOnly
        onGroupClick={() => reDrawLast('horizontalStraightLine')}
        onChevronClick={() => togglePopover('emoji')}
        onItemClick={(item) => handleOverlayItem(item, setEmojiIconKey)}
      />

      <span className="split-line" />

      {/* ── Group 8: Magnet ───────────────────────────────────────────── */}
      <ToolGroup
        groupKey="magnet"
        activeIconKey={magnetIconKey}
        items={magnetItems}
        popoverKey={popoverKey}
        lock={lock} mode={mode} visible={visible}
        onGroupClick={() => {
          const nextMode = mode !== 'normal' ? 'normal' : magnetIconKey
          setMode(nextMode)
          onModeChange(nextMode)
        }}
        onChevronClick={() => togglePopover('magnet')}
        onItemClick={handleMagnetItem}
      />

      {/* ── Group 9: Hide All Drawings (text-only children) ───────────── */}
      <ToolGroup
        groupKey="hideAll"
        activeIconKey="hideAll"
        items={hideAllItems}
        popoverKey={popoverKey}
        lock={lock} mode={mode} visible={visible}
        textOnly
        onGroupClick={() => {
          const next = !visible
          setVisible(next)
          onVisibleChange(next)
        }}
        onChevronClick={() => togglePopover('hideAll')}
        onItemClick={handleHideAllItem}
      />

      <span className="split-line" />

      {/* ── Standalone: Measure ───────────────────────────────────────── */}
      <div className="item">
        <span
          style={{ width: 32, height: 32 }}
          title="Measure"
          onClick={() => onMeasureClick?.()}
        >
          <Icon name="ruler" />
        </span>
      </div>

      {/* ── Standalone: Zoom In ───────────────────────────────────────── */}
      <div className="item">
        <span
          style={{ width: 32, height: 32 }}
          title="Zoom In"
          onClick={() => onZoomClick?.()}
        >
          <Icon name="drawingMode" />
        </span>
      </div>

      {/* ── Standalone: Keep Drawing (toggle) ─────────────────────────── */}
      <div className="item">
        <span
          style={{ width: 32, height: 32, opacity: keepDrawing ? 1 : 0.5 }}
          title={keepDrawing ? 'Keep Drawing: On' : 'Keep Drawing: Off'}
          onClick={() => setKeepDrawing(k => !k)}
        >
          <Icon name="drawingMode" />
        </span>
      </div>

      {/* ── Standalone: Lock All Drawings (toggle) ────────────────────── */}
      <div className="item">
        <span
          style={{ width: 32, height: 32 }}
          title={lock ? 'Unlock All Drawings' : 'Lock All Drawings'}
          onClick={() => {
            const next = !lock
            setLock(next)
            onLockChange(next)
          }}
        >
          <Icon name="lockAll" className={lock ? 'selected' : undefined} />
        </span>
      </div>

      {/* ── Standalone: Delete All Objects ───────────────────────────── */}
      <div className="item">
        <span
          style={{ width: 32, height: 32 }}
          title="Delete All Drawings"
          onClick={() => onRemoveClick(GROUP_ID)}
        >
          <Icon name="trash" />
        </span>
      </div>
    </div>
  )
}

export default DrawingBar
