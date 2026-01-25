/**
 * Setting Modal Widget
 */

import { useState, useMemo } from 'react'
import type { Styles, DeepPartial } from 'klinecharts'
import { utils } from 'klinecharts'
import lodashSet from 'lodash/set'

import { Modal, Select, Switch, Color } from '../../component'
import type { SelectDataSourceItem } from '../../component'
import i18n from '../../i18n'
import { getOptions, type SettingOption } from './data'

export interface SettingModalProps {
  locale: string
  currentStyles: Styles
  onClose: () => void
  onChange: (style: DeepPartial<Styles>) => void
  onRestoreDefault: (options: SettingOption[]) => void
}

const SETTING_TABS = [
  { text: 'Candle', key: 'candle' },
  { text: 'Indicator', key: 'indicator' },
  { text: 'Grid', key: 'grid' },
  { text: 'X-axis', key: 'xAxis' },
  { text: 'Y-axis', key: 'yAxis' },
  { text: 'Separator', key: 'separator' },
  { text: 'Crosshair', key: 'crosshair' },
]

export function SettingModal({
  locale,
  currentStyles,
  onClose,
  onChange,
  onRestoreDefault,
}: SettingModalProps) {
  const [styles, setStyles] = useState(currentStyles)
  const [currentSetting, setCurrentSetting] = useState('candle')

  const options = useMemo(() => getOptions(locale), [locale])

  const update = (option: SettingOption, newValue: unknown) => {
    const style = {}
    lodashSet(style, option.key, newValue)
    const newStyles = utils.clone(styles)
    lodashSet(newStyles, option.key, newValue)
    setStyles(newStyles)
    onChange(style)
  }

  const handleRestoreDefault = () => {
    onRestoreDefault(options)
    onClose()
  }

  const filteredOptions = useMemo(
    () => options.filter((el) => el.key.includes(currentSetting)),
    [options, currentSetting]
  )

  return (
    <Modal
      title={i18n('setting', locale)}
      buttons={[
        {
          children: i18n('restore_default', locale),
          onClick: handleRestoreDefault,
        },
      ]}
      onClose={onClose}
    >
      <div className="superchart-setting-modal-content">
        <div className="sidebar">
          {SETTING_TABS.map((tab) => (
            <button
              key={tab.key}
              className={currentSetting === tab.key ? 'selected' : ''}
              onClick={() => setCurrentSetting(tab.key)}
            >
              {tab.text}
            </button>
          ))}
        </div>
        <div className="content">
          {filteredOptions.map((option) => {
            const value = utils.formatValue(styles, option.key)
            let component: React.ReactNode = null

            switch (option.component) {
              case 'select':
                component = (
                  <Select
                    style={{ width: 120 }}
                    value={i18n(value as string, locale)}
                    dataSource={option.dataSource}
                    onSelected={(data) => {
                      const newValue = (data as SelectDataSourceItem).key
                      update(option, newValue)
                    }}
                  />
                )
                break
              case 'switch':
                component = (
                  <Switch
                    open={!!value}
                    onChange={() => update(option, !value)}
                  />
                )
                break
              case 'color':
                component = (
                  <Color
                    style={{ width: 120 }}
                    value={value as string}
                    reactiveChange={false}
                    onChange={(el) => update(option, el)}
                  />
                )
                break
            }

            return (
              <div key={option.key} className="component">
                <span>{option.text}</span>
                {component}
              </div>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}

export default SettingModal
