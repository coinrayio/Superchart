/**
 * Superchart Helpers
 */

import type { Chart, Nullable, Overlay, YAxis } from 'klinecharts'

export type FontWeights =
  | 'thin'
  | 'extra-light'
  | 'light'
  | 'normal'
  | 'medium'
  | 'semi-bold'
  | 'bold'
  | 'extra-bold'
  | 'black'

/**
 * Get screen size
 */
export const getScreenSize = (): { x: number; y: number } => {
  return {
    x: typeof window !== 'undefined' ? window.innerWidth : 1024,
    y: typeof window !== 'undefined' ? window.innerHeight : 768,
  }
}

/**
 * Get precision for price and volume
 */
export const getPrecision = (
  chart: Chart,
  overlay: Overlay<unknown>,
  yAxis: Nullable<YAxis>
): { price: number; volume: number } => {
  const precision = {
    price: 0,
    volume: 0,
  }

  const symbol = chart.getSymbol()
  if ((yAxis?.isInCandle() ?? true) && symbol) {
    precision.price = symbol.pricePrecision
    precision.volume = symbol.volumePrecision
  } else {
    const indicators = chart.getIndicators({ paneId: overlay.paneId })
    indicators.forEach((indicator) => {
      precision.price = Math.max(precision.price, indicator.precision)
    })
  }

  return precision
}

/**
 * Convert font weight name to number
 */
export const convertFontWeightNameToNumber = (weight: FontWeights): number => {
  const weights: Record<FontWeights, number> = {
    thin: 100,
    'extra-light': 200,
    light: 300,
    normal: 400,
    medium: 500,
    'semi-bold': 600,
    bold: 700,
    'extra-bold': 800,
    black: 900,
  }

  return weights[weight]
}
