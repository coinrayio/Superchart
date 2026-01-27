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

import type { DeepPartial, LineAttrs, SmoothLineStyle } from 'klinecharts'
import { merge } from 'lodash'

import type { OverlayProperties, ProOverlayTemplate } from '../types/overlay'

const brush = (): ProOverlayTemplate => {
  let properties: DeepPartial<OverlayProperties> = {}

  return {
    name: 'brush',
    totalStep: 3,
    needDefaultPointFigure: false,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,
    styles: {},
    createPointFigures: ({ coordinates }) => {
      const lines: LineAttrs[] = []
      if (coordinates.length > 1) {
        const filteredCoords = coordinates.filter((_, i) => i !== 1)

        lines.push({ coordinates: filteredCoords })
      }

      return [
        {
          type: 'line',
          attrs: lines,
          styles: { style: 'solid', smooth: true } as SmoothLineStyle
        },
      ]
    },
    performEventMoveForDrawing: ({ currentStep, points, performPoint }) => {
      if (currentStep >= 2) {
        points.push(performPoint)
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

export default brush
