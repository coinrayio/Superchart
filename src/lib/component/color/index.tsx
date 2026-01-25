/**
 * Color Picker Component
 */

import { useState, type CSSProperties, type ReactNode, type PointerEvent } from 'react'
import chroma from 'chroma-js'

export interface ColorProps {
  className?: string
  style?: CSSProperties
  value?: ReactNode
  valueKey?: string
  reactiveChange?: boolean
  onChange?: (data: string) => void
}

const COLOR_PALETTE = [
  [
    'rgb(255, 255, 255)',
    'rgb(219, 219, 219)',
    'rgb(184, 184, 184)',
    'rgb(156, 156, 156)',
    'rgb(128, 128, 128)',
    'rgb(99, 99, 99)',
    'rgb(74, 74, 74)',
    'rgb(46, 46, 46)',
    'rgb(15, 15, 15)',
    'rgb(0, 0, 0)',
  ],
  [
    'rgb(242, 54, 69)',
    'rgb(255, 152, 0)',
    'rgb(255, 235, 59)',
    'rgb(76, 175, 80)',
    'rgb(8, 153, 129)',
    'rgb(0, 188, 212)',
    'rgb(41, 98, 255)',
    'rgb(103, 58, 183)',
    'rgb(156, 39, 176)',
    'rgb(233, 30, 99)',
  ],
  [
    'rgb(252, 203, 205)',
    'rgb(255, 224, 178)',
    'rgb(255, 249, 196)',
    'rgb(200, 230, 201)',
    'rgb(172, 229, 220)',
    'rgb(178, 235, 242)',
    'rgb(187, 217, 251)',
    'rgb(209, 196, 233)',
    'rgb(225, 190, 231)',
    'rgb(248, 187, 208)',
  ],
  [
    'rgb(250, 161, 164)',
    'rgb(255, 204, 128)',
    'rgb(255, 245, 157)',
    'rgb(165, 214, 167)',
    'rgb(112, 204, 189)',
    'rgb(128, 222, 234)',
    'rgb(144, 191, 249)',
    'rgb(179, 157, 219)',
    'rgb(206, 147, 216)',
    'rgb(244, 143, 177)',
  ],
  [
    'rgb(247, 124, 128)',
    'rgb(255, 183, 77)',
    'rgb(255, 241, 118)',
    'rgb(129, 199, 132)',
    'rgb(66, 189, 168)',
    'rgb(77, 208, 225)',
    'rgb(91, 156, 246)',
    'rgb(149, 117, 205)',
    'rgb(186, 104, 200)',
    'rgb(240, 98, 146)',
  ],
  [
    'rgb(247, 82, 95)',
    'rgb(255, 167, 38)',
    'rgb(255, 238, 88)',
    'rgb(102, 187, 106)',
    'rgb(34, 171, 148)',
    'rgb(38, 198, 218)',
    'rgb(49, 121, 245)',
    'rgb(126, 87, 194)',
    'rgb(171, 71, 188)',
    'rgb(236, 64, 122)',
  ],
  [
    'rgb(178, 40, 51)',
    'rgb(245, 124, 0)',
    'rgb(251, 192, 45)',
    'rgb(56, 142, 60)',
    'rgb(5, 102, 86)',
    'rgb(0, 151, 167)',
    'rgb(24, 72, 204)',
    'rgb(81, 45, 168)',
    'rgb(123, 31, 162)',
    'rgb(194, 24, 91)',
  ],
  [
    'rgb(128, 25, 34)',
    'rgb(230, 81, 0)',
    'rgb(245, 127, 23)',
    'rgb(27, 94, 32)',
    'rgb(0, 51, 42)',
    'rgb(0, 96, 100)',
    'rgb(12, 50, 153)',
    'rgb(49, 27, 146)',
    'rgb(74, 20, 140)',
    'rgb(136, 14, 79)',
  ],
]

// Helper: safe chroma parse -> hex
const toHex = (input: unknown): string => {
  try {
    return chroma(input as string).hex()
  } catch {
    return String(input || '#000000')
  }
}

export function Color({
  className,
  value,
  reactiveChange = true,
  onChange,
}: ColorProps) {
  const initialOpacity = String(value).includes('rgba')
    ? chroma(String(value)).alpha() * 100
    : 100

  const [open, setOpen] = useState(false)
  const [opacity, setOpacity] = useState(initialOpacity)
  const [selectedColor, setSelectedColor] = useState<ReactNode>(value)
  const [finalColor, setFinalColor] = useState<ReactNode>(value)

  // Custom picker state
  const [customMode, setCustomMode] = useState(false)
  const [pickerHex, setPickerHex] = useState<string>((value as string) ?? '#000000')
  const [hue, setHue] = useState<number>(0)
  const [sat, setSat] = useState<number>(1)
  const [light, setLight] = useState<number>(0.5)
  const [squareDragging, setSquareDragging] = useState(false)

  // Colors that can be mutated for custom palette
  const [colors] = useState(COLOR_PALETTE.map((row) => [...row]))

  // Initialize picker from a color
  const initPickerFromColor = (input: string) => {
    const hex = toHex(input)
    const [h, s, l] = chroma(hex).hsl()
    setHue(Number.isFinite(h) ? Math.round(h) : 0)
    setSat(Number.isFinite(s) ? s : 1)
    setLight(Number.isFinite(l) ? l : 0.5)
    setPickerHex(hex)
  }

  const closeColorPalette = () => {
    setOpen(false)
    setCustomMode(false)
  }

  const cancelColorChange = () => {
    setSelectedColor(value)
    setFinalColor(value)
    onChange?.(value as string)
    closeColorPalette()
  }

  const applySelectedColor = (col: string) => {
    setSelectedColor(col)
    const op = opacity / 100
    const x = chroma(col).alpha(op).css()
    setFinalColor(x)
    if (reactiveChange) onChange?.(x)
  }

  const addOpacity = () => {
    const op = opacity / 100
    const x = chroma(selectedColor as string).alpha(op).css()
    setFinalColor(x)
    if (reactiveChange) onChange?.(x)
  }

  const handleRangeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setOpacity(Number(event.target.value))
    addOpacity()
  }

  // Custom picker helpers
  const openCustomPicker = () => {
    const cur = selectedColor ?? value ?? '#000000'
    initPickerFromColor(String(cur))
    setCustomMode(true)
    setOpen(true)
  }

  const onHueChange = (val: number) => {
    setHue(val)
    const col = chroma.hsl(val, sat, light).hex()
    setPickerHex(col)
  }

  const onHexInput = (val: string) => {
    let v = val.trim()
    if (!v.startsWith('#')) v = '#' + v
    try {
      const hex = chroma(v).hex()
      const [h, s, l] = chroma(hex).hsl()
      setHue(Number.isFinite(h) ? Math.round(h) : hue)
      setSat(Number.isFinite(s) ? s : sat)
      setLight(Number.isFinite(l) ? l : light)
      setPickerHex(hex)
    } catch {
      setPickerHex(val)
    }
  }

  // Pointer handlers for the color square
  const handleSquarePointer = (e: PointerEvent<HTMLDivElement>) => {
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    const x = Math.min(Math.max(0, e.clientX - rect.left), rect.width)
    const y = Math.min(Math.max(0, e.clientY - rect.top), rect.height)
    const s = rect.width ? x / rect.width : 0
    const l = rect.height ? 1 - y / rect.height : 0.5
    setSat(s)
    setLight(l)
    const col = chroma.hsl(hue, s, l).hex()
    setPickerHex(col)
  }

  const onSquarePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    setSquareDragging(true)
    handleSquarePointer(e)
  }

  const onSquarePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!squareDragging) return
    handleSquarePointer(e)
  }

  const onSquarePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    try {
      ;(e.target as Element).releasePointerCapture?.(e.pointerId)
    } catch {}
    setSquareDragging(false)
  }

  const addCustomColorToPalette = () => {
    try {
      const hex = toHex(pickerHex)
      colors[0].unshift(hex)
      applySelectedColor(hex)
      setCustomMode(false)
    } catch {
      // Ignore invalid color
    }
  }

  return (
    <div
      style={{ width: 120, backgroundColor: finalColor as string }}
      className={`superchart-color ${className ?? ''} ${open ? 'superchart-color-show' : ''}`}
      tabIndex={0}
    >
      <div className="selector-container" onClick={() => setOpen(true)}>
        <i className="arrow" />
      </div>

      <div className="drop-down-container" style={{ left: '50%', top: '20%' }}>
        {/* Color palette */}
        {!customMode &&
          colors.map((row, rowIndex) => (
            <div className="each_line" key={rowIndex}>
              {row.map((color, colIndex) => (
                <div
                  key={colIndex}
                  className={`each_color ${color === selectedColor ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={(e) => {
                    e.preventDefault()
                    applySelectedColor(color)
                  }}
                />
              ))}
            </div>
          ))}

        {/* Plus button for custom color */}
        {!customMode && (
          <div className="each_line" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.04)',
                cursor: 'pointer',
              }}
              onClick={(e) => {
                e.stopPropagation()
                openCustomPicker()
              }}
            >
              <span
                style={{
                  fontSize: 18,
                  lineHeight: 1,
                  color: 'var(--superchart-text-color, #fff)',
                }}
              >
                +
              </span>
            </div>
          </div>
        )}

        {/* Custom picker UI */}
        {customMode && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: 6,
              width: 260,
            }}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 4,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: pickerHex,
                }}
              />
              <input
                style={{
                  flex: 1,
                  padding: 6,
                  borderRadius: 4,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'transparent',
                  color: 'inherit',
                }}
                value={pickerHex}
                onChange={(e) => onHexInput(e.target.value)}
              />
            </div>

            {/* Saturation/Lightness square */}
            <div
              style={{
                width: 220,
                height: 140,
                borderRadius: 6,
                position: 'relative',
                touchAction: 'none',
                cursor: 'pointer',
                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.2)',
              }}
              onPointerDown={onSquarePointerDown}
              onPointerMove={onSquarePointerMove}
              onPointerUp={onSquarePointerUp}
            >
              {/* Saturation gradient */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 6,
                  background: `linear-gradient(to right, hsl(${hue}, 0%, 50%), hsl(${hue}, 100%, 50%))`,
                }}
              />
              {/* Lightness overlay */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 6,
                  background: 'linear-gradient(to top, #ffffff, rgba(255,255,255,0))',
                  mixBlendMode: 'overlay',
                  opacity: 0.6,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 6,
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0), #000)',
                  opacity: 0.6,
                }}
              />
              {/* Picker dot */}
              <div
                style={{
                  position: 'absolute',
                  left: `${Math.round(sat * 100)}%`,
                  top: `${Math.round((1 - light) * 100)}%`,
                  transform: 'translate(-50%,-50%)',
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  boxShadow: '0 0 0 2px rgba(255,255,255,0.9)',
                  border: '1px solid rgba(0,0,0,0.6)',
                  background: pickerHex,
                }}
              />
            </div>

            {/* Hue slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="range"
                min="0"
                max="360"
                value={hue}
                onChange={(e) => onHueChange(Number(e.target.value))}
                style={{
                  flex: 1,
                  height: 10,
                  background:
                    'linear-gradient(90deg, red 0%, yellow 17%, lime 33%, cyan 50%, blue 67%, magenta 83%, red 100%)',
                  borderRadius: 6,
                  padding: 0,
                }}
              />
              <span style={{ width: 38, textAlign: 'center' }}>{hue}</span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="cancel" onClick={() => setCustomMode(false)}>
                Cancel
              </button>
              <button className="ok" onClick={addCustomColorToPalette}>
                Add
              </button>
            </div>
          </div>
        )}

        <div className="split_line" />

        {/* Opacity slider */}
        <div className="range_div">
          <input
            className="range"
            style={{
              backgroundColor: finalColor as string,
              border: `1px solid ${selectedColor as string}`,
            }}
            type="range"
            min="1"
            max="100"
            value={opacity}
            onChange={handleRangeChange}
          />
          <p>{opacity}%</p>
        </div>

        <div className="split_line" />

        {/* Submit buttons */}
        <div className="submit">
          <span className="cancel" onClick={cancelColorChange}>
            Cancel
          </span>
          <span
            onClick={() => {
              if (!reactiveChange) onChange?.(finalColor as string)
              closeColorPalette()
            }}
          >
            Ok
          </span>
        </div>
      </div>
    </div>
  )
}

export default Color
