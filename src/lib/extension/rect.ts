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

import type { DeepPartial, PolygonStyle } from 'klinecharts'
import { merge } from 'lodash'

import type { OverlayProperties, ProOverlayTemplate } from '../types/overlay'

const rect = (): ProOverlayTemplate => {
  let properties: Map<string, DeepPartial<OverlayProperties>> = new Map()

  let rectStyle = (id: string): DeepPartial<PolygonStyle> => {
    const property = properties.get(id)
    return {
      style: property?.style ?? 'stroke_fill',
      color: property?.backgroundColor ?? 'rgba(22, 119, 255, 0.15)',
      borderColor: property?.lineColor ?? property?.borderColor,
      borderSize: property?.borderWidth,
      borderStyle: property?.borderStyle ?? property?.lineStyle
    }
  }
  return {
    name: 'rect',
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ coordinates, overlay }) => {
      if (coordinates.length > 1) {
        return [
          {
            type: 'polygon',
            attrs: {
              coordinates: [
                coordinates[0],
                { x: coordinates[1].x, y: coordinates[0].y },
                coordinates[1],
                { x: coordinates[0].x, y: coordinates[1].y }
              ]
            },
            styles: rectStyle(overlay.id)
          }
        ]
      }
      return []
    },
    setProperties: (_properties: DeepPartial<OverlayProperties>, id: string) => {
      properties.set(id, merge({}, properties.get(id), _properties) as OverlayProperties)
    },
    getProperties: (id: string): DeepPartial<OverlayProperties> => {
      return properties.get(id) ?? {}
    }
  }
}

export default rect
