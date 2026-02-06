/**
 * IndicatorSettingModal - Modal for configuring indicator parameters
 *
 * Supports both built-in indicators (calcParams) and backend indicators
 * (typed settings from IndicatorSettingDef[]).
 *
 * Follows the pattern from coinray-chart-ui/src/widget/indicator-setting-modal
 */

import { useState } from 'react'
import { utils } from 'klinecharts'
import { Modal, Input, Switch, Color, Select } from '../../component'
import i18n from '../../i18n'
import { getIndicatorConfig, type IndicatorParamConfig } from './data'
import type { IndicatorSettingDef, SettingValue } from '../../types/indicator'

export interface IndicatorSettingParams {
  indicatorName: string
  paneId: string
  calcParams: unknown[]
}

export interface IndicatorSettingModalProps {
  /** Locale for translations */
  locale?: string
  /** Indicator parameters to edit (built-in indicators) */
  params: IndicatorSettingParams
  /** Backend indicator setting definitions */
  backendSettings?: IndicatorSettingDef[]
  /** Current backend setting values */
  backendSettingValues?: Record<string, SettingValue>
  /** Called when modal is closed */
  onClose: () => void
  /** Called when built-in settings are confirmed */
  onConfirm: (calcParams: unknown[]) => void
  /** Called when backend settings are confirmed */
  onBackendConfirm?: (settings: Record<string, SettingValue>) => void
}

export function IndicatorSettingModal({
  locale = 'en-US',
  params,
  backendSettings,
  backendSettingValues,
  onClose,
  onConfirm,
  onBackendConfirm,
}: IndicatorSettingModalProps) {
  const isBackend = backendSettings && backendSettings.length > 0

  // Built-in indicator state
  const [calcParams, setCalcParams] = useState<unknown[]>(() =>
    utils.clone(params.calcParams) as unknown[]
  )

  // Backend indicator state
  const [settings, setSettings] = useState<Record<string, SettingValue>>(() =>
    backendSettingValues ? { ...backendSettingValues } : {}
  )

  const config = getIndicatorConfig(params.indicatorName)

  const handleConfirm = () => {
    if (isBackend) {
      onBackendConfirm?.(settings)
      onClose()
      return
    }

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

  const handleSettingChange = (id: string, value: SettingValue) => {
    setSettings((prev) => ({ ...prev, [id]: value }))
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
        {isBackend ? (
          /* Backend indicator settings */
          backendSettings!.map((def: IndicatorSettingDef) => (
            <div key={def.id} className="superchart-indicator-setting-modal-row">
              <span className="superchart-indicator-setting-modal-label">
                {def.name}
              </span>
              {renderSettingControl(def, settings[def.id] ?? def.defaultValue, handleSettingChange)}
            </div>
          ))
        ) : (
          /* Built-in indicator calcParams */
          config.map((paramConfig: IndicatorParamConfig, index: number) => (
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
          ))
        )}
      </div>
    </Modal>
  )
}

/**
 * Render the appropriate control for a backend setting definition
 */
function renderSettingControl(
  def: IndicatorSettingDef,
  value: SettingValue,
  onChange: (id: string, value: SettingValue) => void
) {
  switch (def.type) {
    case 'number':
      return (
        <Input
          style={{ width: '200px' }}
          value={String(value ?? '')}
          onChange={(v) => {
            const num = Number(v)
            if (!isNaN(num)) {
              const clamped = Math.max(
                def.min ?? -Infinity,
                Math.min(def.max ?? Infinity, num)
              )
              onChange(def.id, clamped)
            }
          }}
        />
      )

    case 'boolean':
      return (
        <Switch
          open={Boolean(value)}
          onChange={() => onChange(def.id, !value)}
        />
      )

    case 'string':
      return (
        <Input
          style={{ width: '200px' }}
          value={String(value ?? '')}
          onChange={(v) => onChange(def.id, v)}
        />
      )

    case 'color':
      return (
        <Color
          value={String(value ?? '#000000')}
          onChange={(color) => onChange(def.id, color)}
        />
      )

    case 'select':
      return (
        <Select
          value={String(value)}
          dataSource={(def.options ?? []).map((opt) => ({
            key: opt.value,
            text: opt.label,
          }))}
          onSelected={(item) => onChange(def.id, typeof item === 'string' ? item : item.key)}
        />
      )

    default:
      return (
        <Input
          style={{ width: '200px' }}
          value={String(value ?? '')}
          onChange={(v) => onChange(def.id, v)}
        />
      )
  }
}

export default IndicatorSettingModal
