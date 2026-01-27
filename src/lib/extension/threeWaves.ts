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

import type { DeepPartial, LineStyle, TextStyle } from 'klinecharts'
import { merge } from 'lodash'

import type { OverlayProperties, ProOverlayTemplate } from '../types/overlay'

const threeWaves = (): ProOverlayTemplate => {
  let properties: DeepPartial<OverlayProperties> = {}

  const lineStyle = (): DeepPartial<LineStyle> => {
    return {
      style: properties.lineStyle,
      size: properties.lineWidth,
      color: properties.lineColor ?? properties.borderColor,
      dashedValue: properties.lineDashedValue
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
    name: 'threeWaves',
    totalStep: 5,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ coordinates }) => {
      const texts = coordinates.map((coordinate, i) => ({
        ...coordinate,
        text: `(${i})`,
        baseline: 'bottom'
      }))
      return [
        {
          type: 'line',
          attrs: { coordinates },
          styles: lineStyle()
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

export default threeWaves
