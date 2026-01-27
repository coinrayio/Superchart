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

const triangle = (): ProOverlayTemplate => {
  let properties: DeepPartial<OverlayProperties> = {}

  let triangleStyle = (): DeepPartial<PolygonStyle> => {
    return {
      style: properties.style ?? 'stroke_fill',
      color: properties.backgroundColor ?? 'rgba(22, 119, 255, 0.15)',
      borderColor: properties.lineColor ?? properties.borderColor,
      borderSize: properties.borderWidth,
      borderStyle: properties.borderStyle ?? properties.lineStyle
    }
  }
  return {
    name: 'triangle',
    totalStep: 4,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ coordinates }) => {
      return [
        {
          type: 'polygon',
          attrs: { coordinates },
          styles: triangleStyle()
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

export default triangle
