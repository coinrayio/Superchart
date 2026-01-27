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

const parallelogram = (): ProOverlayTemplate => {
  let properties: DeepPartial<OverlayProperties> = {}

  let polygonStyle = (): DeepPartial<PolygonStyle> => {
    return {
      style: properties.style ?? 'stroke_fill',
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

  return {
    name: 'parallelogram',
    totalStep: 4,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ coordinates }) => {
      if (coordinates.length === 2) {
        return [
          {
            type: 'line',
            ignoreEvent: true,
            attrs: { coordinates },
            styles: lineStyle()
          }
        ]
      }
      if (coordinates.length === 3) {
        const coordinate = { x: coordinates[0].x + (coordinates[2].x - coordinates[1].x), y: coordinates[2].y }
        return [
          {
            type: 'polygon',
            attrs: { coordinates: [coordinates[0], coordinates[1], coordinates[2], coordinate] },
            styles: polygonStyle()
          }
        ]
      }
      return []
    },
    performEventPressedMove: ({ points, performPointIndex, performPoint }) => {
      if (performPointIndex < 2) {
        points[0].value = performPoint.value
        points[1].value = performPoint.value
      }
    },
    performEventMoveForDrawing: ({ currentStep, points, performPoint }) => {
      if (currentStep === 2) {
        points[0].value = performPoint.value
      }
    },
    setProperties: (_properties: DeepPartial<OverlayProperties>) => {
      properties = merge({}, properties, _properties) as OverlayProperties
    },
    getProperties: (): DeepPartial<OverlayProperties> => {
      return properties
    }
  }
}

export default parallelogram
