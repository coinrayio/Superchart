/**
 * Setting Modal Data
 */

import i18n from '../../i18n'
import type { SelectDataSourceItem } from '../../component'

export interface SettingOption {
  key: string
  text: string
  component: 'select' | 'switch' | 'color'
  dataSource?: SelectDataSourceItem[]
}

// Data source generators
function createSizeOptions(_locale: string): SelectDataSourceItem[] {
  return [
    { key: '1', text: '1' },
    { key: '2', text: '2' },
    { key: '3', text: '3' },
    { key: '4', text: '4' },
    { key: '5', text: '5' },
  ]
}

function createCandleTypeOptions(locale: string): SelectDataSourceItem[] {
  return [
    { key: 'candle_solid', text: i18n('candle_solid', locale) },
    { key: 'candle_stroke', text: i18n('candle_stroke', locale) },
    { key: 'candle_up_stroke', text: i18n('candle_up_stroke', locale) },
    { key: 'candle_down_stroke', text: i18n('candle_down_stroke', locale) },
    { key: 'ohlc', text: i18n('ohlc', locale) },
    { key: 'area', text: i18n('area', locale) },
  ]
}

function createPriceAxisTypeOptions(locale: string): SelectDataSourceItem[] {
  return [
    { key: 'normal', text: i18n('normal', locale) },
    { key: 'percentage', text: i18n('percentage', locale) },
    { key: 'log', text: i18n('log', locale) },
  ]
}

export function getOptions(locale: string): SettingOption[] {
  return [
    // Candle settings
    {
      key: 'candle.type',
      text: i18n('candle_type', locale),
      component: 'select',
      dataSource: createCandleTypeOptions(locale),
    },
    {
      key: 'candle.priceMark.last.show',
      text: i18n('last_price_show', locale),
      component: 'switch',
    },
    {
      key: 'candle.priceMark.high.show',
      text: i18n('high_price_show', locale),
      component: 'switch',
    },
    {
      key: 'candle.priceMark.low.show',
      text: i18n('low_price_show', locale),
      component: 'switch',
    },

    // Indicator settings
    {
      key: 'indicator.lastValueMark.show',
      text: i18n('indicator_last_value_show', locale),
      component: 'switch',
    },

    // Grid settings
    {
      key: 'grid.show',
      text: i18n('grid_show', locale),
      component: 'switch',
    },

    // X-Axis settings
    {
      key: 'xAxis.show',
      text: 'Show X-Axis',
      component: 'switch',
    },

    // Y-Axis settings
    {
      key: 'yAxis.show',
      text: 'Show Y-Axis',
      component: 'switch',
    },
    {
      key: 'yAxis.type',
      text: i18n('price_axis_type', locale),
      component: 'select',
      dataSource: createPriceAxisTypeOptions(locale),
    },
    {
      key: 'yAxis.reverse',
      text: i18n('reverse_coordinate', locale),
      component: 'switch',
    },

    // Separator settings
    {
      key: 'separator.size',
      text: 'Separator Size',
      component: 'select',
      dataSource: createSizeOptions(locale),
    },
    {
      key: 'separator.fill',
      text: 'Fill',
      component: 'switch',
    },
    {
      key: 'separator.activeBackgroundColor',
      text: 'Background Color',
      component: 'color',
    },

    // Crosshair settings
    {
      key: 'crosshair.show',
      text: 'Show Crosshair',
      component: 'switch',
    },
  ]
}
