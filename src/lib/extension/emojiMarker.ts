/**
 * Emoji Marker Overlay
 *
 * Renders a single emoji character at the clicked position on the chart.
 * Used by the drawing bar's emoji group.
 *
 * extendData: { text: '🚀' } or just the emoji string directly.
 */

import { type ProOverlayTemplate, type DeepPartial, utils } from 'klinecharts'

const { merge, clone } = utils

interface EmojiMarkerProperties {
  text?: string
  fontSize?: number
}

const defaultStyle: Required<EmojiMarkerProperties> = {
  text: '⭐',
  fontSize: 24
}

const emojiMarker = (): ProOverlayTemplate => {
  let properties: DeepPartial<EmojiMarkerProperties> = {}

  const _extRef: { data: DeepPartial<EmojiMarkerProperties> | null } = { data: null }

  const prop = <K extends keyof EmojiMarkerProperties>(key: K): EmojiMarkerProperties[K] => {
    const ext = _extRef.data as Record<string, unknown> | null
    const props = properties as Record<string, unknown>
    const defaults = defaultStyle as Record<string, unknown>
    return (ext?.[key] ?? props[key] ?? defaults[key]) as EmojiMarkerProperties[K]
  }

  return {
    name: 'emojiMarker',
    totalStep: 2,
    needDefaultPointFigure: false,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,

    createPointFigures: ({ coordinates, overlay }) => {
      if (coordinates.length === 0) return []

      _extRef.data = (overlay.extendData != null && typeof overlay.extendData === 'object')
        ? overlay.extendData as DeepPartial<EmojiMarkerProperties>
        : typeof overlay.extendData === 'string'
          ? { text: overlay.extendData }
          : null

      const text = prop('text') ?? defaultStyle.text
      const fontSize = prop('fontSize') ?? defaultStyle.fontSize

      return [
        {
          type: 'text',
          key: 'emoji',
          attrs: {
            x: coordinates[0].x,
            y: coordinates[0].y,
            text,
            align: 'center',
            baseline: 'middle'
          },
          styles: {
            color: '#000000',
            backgroundColor: 'transparent',
            borderSize: 0,
            size: fontSize,
            paddingLeft: 0,
            paddingRight: 0,
            paddingTop: 0,
            paddingBottom: 0
          }
        }
      ]
    },

    onSelected: ({ overlay }) => {
      overlay.mode = 'normal'
      return false
    },

    onRightClick: (event) => {
      ;(event as unknown as { preventDefault?: () => void }).preventDefault?.()
      return false
    },

    setProperties: (_properties: DeepPartial<EmojiMarkerProperties>, _id: string) => {
      const newProps = clone(properties) as Record<string, unknown>
      merge(newProps, _properties)
      properties = newProps as DeepPartial<EmojiMarkerProperties>
    },

    getProperties: (_id: string): DeepPartial<EmojiMarkerProperties> => properties
  }
}

export default emojiMarker
