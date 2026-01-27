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

import type { DeepPartial, LineStyle, PolygonStyle } from 'klinecharts'
import { merge } from 'lodash'

import type { OverlayProperties, ProOverlayTemplate } from '../types/overlay'

const gannBox = (): ProOverlayTemplate => {
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
      style: 'dashed',
      size: properties.lineWidth,
      color: properties.lineColor ?? properties.borderColor,
      dashedValue: properties.lineDashedValue
    }
  }
  const solidLineStyle = (): DeepPartial<LineStyle> => {
    return {
      style: 'solid',
      size: properties.lineWidth,
      color: properties.lineColor ?? properties.borderColor,
      dashedValue: properties.lineDashedValue
    }
  }

  return {
    name: 'gannBox',
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ coordinates }) => {
      if (coordinates.length > 1) {
        const quarterYDis = (coordinates[1].y - coordinates[0].y) / 4
        const xDis = coordinates[1].x - coordinates[0].x
        const dashedLines = [
          { coordinates: [coordinates[0], { x: coordinates[1].x, y: coordinates[1].y - quarterYDis }] },
          { coordinates: [coordinates[0], { x: coordinates[1].x, y: coordinates[1].y - quarterYDis * 2 }] },
          { coordinates: [{ x: coordinates[0].x, y: coordinates[1].y }, { x: coordinates[1].x, y: coordinates[0].y + quarterYDis }] },
          { coordinates: [{ x: coordinates[0].x, y: coordinates[1].y }, { x: coordinates[1].x, y: coordinates[0].y + quarterYDis * 2 }] },

          { coordinates: [{ ...coordinates[0] }, { x: coordinates[0].x + xDis * 0.236, y: coordinates[1].y }] },
          { coordinates: [{ ...coordinates[0] }, { x: coordinates[0].x + xDis * 0.5, y: coordinates[1].y }] },

          { coordinates: [{ x: coordinates[0].x, y: coordinates[1].y }, { x: coordinates[0].x + xDis * 0.236, y: coordinates[0].y }]},
          { coordinates: [{ x: coordinates[0].x, y: coordinates[1].y }, { x: coordinates[0].x + xDis * 0.5, y: coordinates[0].y }] }
        ]
        const solidLines = [
          { coordinates: [coordinates[0], coordinates[1]] },
          { coordinates: [{ x: coordinates[0].x, y: coordinates[1].y }, { x: coordinates[1].x, y: coordinates[0].y }] }
        ]
        return [
          {
            type: 'line',
            attrs: [
              { coordinates: [coordinates[0], { x: coordinates[1].x, y: coordinates[0].y }] },
              { coordinates: [{ x: coordinates[1].x, y: coordinates[0].y }, coordinates[1]] },
              { coordinates: [coordinates[1], { x: coordinates[0].x, y: coordinates[1].y }] },
              { coordinates: [{ x: coordinates[0].x, y: coordinates[1].y }, coordinates[0]] }
            ],
            styles: lineStyle()
          },
          {
            type: 'polygon',
            ignoreEvent: true,
            attrs: {
              coordinates: [
                coordinates[0],
                { x: coordinates[1].x, y: coordinates[0].y },
                coordinates[1],
                { x: coordinates[0].x, y: coordinates[1].y }
              ]
            },
            styles: polygonStyle()
          },
          {
            type: 'line',
            attrs: dashedLines,
            styles: dashedLineStyle()
          },
          {
            type: 'line',
            attrs: solidLines,
            styles: solidLineStyle()
          }
        ]
      }
      return []
    },
    setProperties: (_properties: DeepPartial<OverlayProperties>) => {
      properties = merge({}, properties, _properties) as OverlayProperties
    },
    getProperties: (): DeepPartial<OverlayProperties> => {
      return properties
    }
  }
}

export default gannBox
