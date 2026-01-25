/**
 * Indicator Modal Widget
 */

import { Modal, List, Checkbox } from '../../component'
import i18n from '../../i18n'

type OnIndicatorChange = (params: {
  name: string
  paneId?: string
  id: string
  added: boolean
}) => void

export interface IndicatorModalProps {
  locale: string
  mainIndicators: string[]
  subIndicators: Record<string, string>
  onMainIndicatorChange: OnIndicatorChange
  onSubIndicatorChange: OnIndicatorChange
  onClose: () => void
}

const MAIN_INDICATOR_LIST = ['MA', 'EMA', 'SMA', 'BOLL', 'SAR', 'BBI']

const SUB_INDICATOR_LIST = [
  'MA',
  'EMA',
  'VOL',
  'MACD',
  'BOLL',
  'KDJ',
  'RSI',
  'BIAS',
  'BRAR',
  'CCI',
  'DMI',
  'CR',
  'PSY',
  'DMA',
  'TRIX',
  'OBV',
  'VR',
  'WR',
  'MTM',
  'EMV',
  'SAR',
  'SMA',
  'ROC',
  'PVT',
  'BBI',
  'AO',
]

export function IndicatorModal({
  locale,
  mainIndicators,
  subIndicators,
  onMainIndicatorChange,
  onSubIndicatorChange,
  onClose,
}: IndicatorModalProps) {
  return (
    <Modal
      title={i18n('indicator', locale)}
      width={400}
      onClose={onClose}
    >
      <List className="superchart-indicator-modal-list">
        <li className="title">{i18n('main_indicator', locale)}</li>
        {MAIN_INDICATOR_LIST.map((name) => {
          const checked = mainIndicators.includes(name)
          return (
            <li
              key={name}
              className="row"
              onClick={() => {
                onMainIndicatorChange({
                  name,
                  id: 'candle_pane',
                  added: !checked,
                })
              }}
            >
              <Checkbox
                checked={checked}
                label={i18n(name.toLowerCase(), locale)}
              />
            </li>
          )
        })}
        <li className="title">{i18n('sub_indicator', locale)}</li>
        {SUB_INDICATOR_LIST.map((name) => {
          const checked = name in subIndicators
          return (
            <li
              key={name}
              className="row"
              onClick={() => {
                onSubIndicatorChange({
                  name,
                  id: subIndicators[name] ?? '',
                  added: !checked,
                })
              }}
            >
              <Checkbox
                checked={checked}
                label={i18n(name.toLowerCase(), locale)}
              />
            </li>
          )
        })}
      </List>
    </Modal>
  )
}

export default IndicatorModal
