/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { PolygonAttrs, LineAttrs, DeepPartial, LineStyle, TextStyle, PolygonStyle } from 'klinecharts'
import { merge } from 'lodash'

import type { OverlayProperties, ProOverlayTemplate } from '../types/overlay'

const xabcd = (): ProOverlayTemplate => {
  let properties: DeepPartial<OverlayProperties> = {}

  let polygonStyle = (): DeepPartial<PolygonStyle> => {
    return {
      style: properties.style ?? 'fill',
      color: properties.backgroundColor ?? 'rgba(22, 119, 255, 0.15)',
      borderColor: properties.lineColor ?? properties.borderColor,
      borderSize: properties.borderWidth,
      borderStyle: properties.borderStyle ?? properties.lineStyle
    }
  }
  const lineStyle = (): DeepPartial<LineStyle> => {
    return {
      style: properties.lineStyle,
      size: properties.lineWidth,
      color: properties.lineColor ?? properties.borderColor,
      dashedValue: properties.lineDashedValue
    }
  }
  const dashedLineStyle = (): DeepPartial<LineStyle> => {
    return {
      ...lineStyle(),
      style: 'dashed'
    }
  }
  const textStyle = (): DeepPartial<TextStyle> => {
    return {
      color: properties.textColor,
      family: properties.textFont,
      size: properties.textFontSize,
      weight: properties.textFontWeight,
      backgroundColor: properties.textBackgroundColor,
      paddingLeft: properties.textPaddingLeft,
      paddingRight: properties.textPaddingRight,
      paddingTop: properties.textPaddingTop,
      paddingBottom: properties.textPaddingBottom
    }
  }

  return {
    name: 'xabcd',
    totalStep: 6,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    styles: {
      polygon: {
        color: 'rgba(22, 119, 255, 0.15)'
      }
    },
    createPointFigures: ({ coordinates }) => {
      const dashedLines: LineAttrs[] = []
      const polygons: PolygonAttrs[] = []
      const tags = ['X', 'A', 'B', 'C', 'D']
      const texts = coordinates.map((coordinate, i) => ({
        ...coordinate,
        baseline: 'bottom',
        text: `(${tags[i]})`
      }))
      if (coordinates.length > 2) {
        dashedLines.push({ coordinates: [coordinates[0], coordinates[2]] })
        polygons.push({ coordinates: [coordinates[0], coordinates[1], coordinates[2]] })
        if (coordinates.length > 3) {
          dashedLines.push({ coordinates: [coordinates[1], coordinates[3]] })
          if (coordinates.length > 4) {
            dashedLines.push({ coordinates: [coordinates[2], coordinates[4]] })
            polygons.push({ coordinates: [coordinates[2], coordinates[3], coordinates[4]] })
          }
        }
      }
      return [
        {
          type: 'line',
          attrs: { coordinates },
          styles: lineStyle()
        },
        {
          type: 'line',
          attrs: dashedLines,
          styles: dashedLineStyle()
        },
        {
          type: 'polygon',
          ignoreEvent: true,
          attrs: polygons,
          styles: polygonStyle()
        },
        {
          type: 'text',
          ignoreEvent: true,
          attrs: texts,
          styles: textStyle()
        }
      ]
    },
    setProperties: (_properties: DeepPartial<OverlayProperties>) => {
      properties = merge({}, properties, _properties) as OverlayProperties
    },
    getProperties: (): DeepPartial<OverlayProperties> => {
      return properties
    }
  }
}

export default xabcd
