/**
 * Overlay Extensions for Superchart
 *
 * This module exports all custom overlay templates for use with klinecharts.
 * These overlays extend the base functionality with additional drawing tools
 * including shapes, Fibonacci tools, Gann analysis, wave patterns, and more.
 */

import arrow from './arrow'
import brush from './brush'
import circle from './circle'
import rect from './rect'
import triangle from './triangle'
import parallelogram from './parallelogram'
import fibonacciCircle from './fibonacciCircle'
import fibonacciSegment from './fibonacciSegment'
import fibonacciSpiral from './fibonacciSpiral'
import fibonacciSpeedResistanceFan from './fibonacciSpeedResistanceFan'
import fibonacciExtension from './fibonacciExtension'
import gannBox from './gannBox'
import threeWaves from './threeWaves'
import fiveWaves from './fiveWaves'
import eightWaves from './eightWaves'
import anyWaves from './anyWaves'
import abcd from './abcd'
import xabcd from './xabcd'

/**
 * All custom overlay templates
 * Register these with klinecharts using chart.addOverlay()
 */
const overlays = [
  arrow(),
  brush(),
  circle(),
  rect(),
  triangle(),
  parallelogram(),
  fibonacciCircle(),
  fibonacciSegment(),
  fibonacciSpiral(),
  fibonacciSpeedResistanceFan(),
  fibonacciExtension(),
  gannBox(),
  threeWaves(),
  fiveWaves(),
  eightWaves(),
  anyWaves(),
  abcd(),
  xabcd(),
]

export default overlays

// Named exports for individual overlays
export {
  arrow,
  brush,
  circle,
  rect,
  triangle,
  parallelogram,
  fibonacciCircle,
  fibonacciSegment,
  fibonacciSpiral,
  fibonacciSpeedResistanceFan,
  fibonacciExtension,
  gannBox,
  threeWaves,
  fiveWaves,
  eightWaves,
  anyWaves,
  abcd,
  xabcd,
}

// Re-export utilities
export { getRotateCoordinate, getRayLine, getDistance } from './utils'
