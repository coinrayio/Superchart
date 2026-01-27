/**
 * IndicatorSettingModal - Modal for configuring indicator parameters
 *
 * Follows the pattern from coinray-chart-ui/src/widget/indicator-setting-modal
 */

import { useState } from 'react'
import { utils } from 'klinecharts'
import { Modal, Input } from '../../component'
import i18n from '../../i18n'
import { getIndicatorConfig, type IndicatorParamConfig } from './data'

export interface IndicatorSettingParams {
  indicatorName: string
  paneId: string
  calcParams: unknown[]
}

export interface IndicatorSettingModalProps {
  /** Locale for translations */
  locale?: string
  /** Indicator parameters to edit */
  params: IndicatorSettingParams
  /** Called when modal is closed */
  onClose: () => void
  /** Called when settings are confirmed */
  onConfirm: (calcParams: unknown[]) => void
}

export function IndicatorSettingModal({
  locale = 'en-US',
  params,
  onClose,
  onConfirm,
}: IndicatorSettingModalProps) {
  const [calcParams, setCalcParams] = useState<unknown[]>(() =>
    utils.clone(params.calcParams) as unknown[]
  )

  const config = getIndicatorConfig(params.indicatorName)

  const handleConfirm = () => {
    const finalParams: unknown[] = []
    const clonedParams = utils.clone(calcParams) as unknown[]

    clonedParams.forEach((param: unknown, i: number) => {
      if (!utils.isValid(param) || param === '') {
        if (config[i] && 'default' in config[i]) {
          finalParams.push(config[i].default)
        }
      } else {
        finalParams.push(param)
      }
    })

    onConfirm(finalParams)
    onClose()
  }

  const handleParamChange = (index: number, value: string | number) => {
    const newParams = utils.clone(calcParams) as unknown[]
    newParams[index] = value
    setCalcParams(newParams)
  }

  return (
    <Modal
      title={params.indicatorName}
      width={360}
      buttons={[
        {
          type: 'confirm',
          children: i18n('confirm', locale),
          onClick: handleConfirm,
        }
      ]}
      onClose={onClose}
    >
      <div className="superchart-indicator-setting-modal-content">
        {config.map((paramConfig: IndicatorParamConfig, index: number) => (
          <div key={paramConfig.paramNameKey} className="superchart-indicator-setting-modal-row">
            <span className="superchart-indicator-setting-modal-label">
              {i18n(paramConfig.paramNameKey, locale)}
            </span>
            <Input
              style={{ width: '200px' }}
              value={String(calcParams[index] ?? '')}
              onChange={(value) => handleParamChange(index, value)}
            />
          </div>
        ))}
      </div>
    </Modal>
  )
}

export default IndicatorSettingModal
