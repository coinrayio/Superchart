/**
 * IndicatorSettingModal - Modal for configuring indicator parameters
 *
 * Supports both built-in indicators (calcParams) and backend indicators
 * (typed settings from IndicatorSettingDef[]).
 *
 * Follows the pattern from coinray-chart-ui/src/widget/indicator-setting-modal
 */

import { useEffect, useState } from 'react'
import { utils } from 'klinecharts'
import { Modal, Input, Switch, Color, Select } from '../../component'
import i18n from '../../i18n'
import { getIndicatorConfig, type IndicatorParamConfig } from './data'
import type { IndicatorSettingDef, SettingValue } from '../../types/indicator'
import { useChartStore } from '../../store/chartStoreContext'
import { useFeature } from '../../features/useFeature'
import type { StudyTemplate, StudyTemplateMeta } from '../../types/storage'

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

  // ---- Study templates (Ticket 4) ----
  // Show the templates row only when the feature flag is on AND the
  // configured adapter actually implements the four template methods.
  // Adapters without template support → row hidden, behavior unchanged.
  const store = useChartStore()
  const studyTemplatesFeature = useFeature('study_templates')
  const adapter = store.storageAdapter()
  const adapterSupportsTemplates =
    !!adapter &&
    typeof adapter.listStudyTemplates === 'function' &&
    typeof adapter.loadStudyTemplate === 'function' &&
    typeof adapter.saveStudyTemplate === 'function'
  const showTemplatesRow = studyTemplatesFeature && adapterSupportsTemplates

  const [templateList, setTemplateList] = useState<StudyTemplateMeta[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [templateError, setTemplateError] = useState<string | null>(null)

  const refreshTemplateList = async () => {
    if (!showTemplatesRow || !adapter?.listStudyTemplates) return
    try {
      const list = await adapter.listStudyTemplates(params.indicatorName)
      setTemplateList(list)
    } catch (err) {
      setTemplateError((err as Error).message)
    }
  }

  useEffect(() => {
    void refreshTemplateList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.indicatorName, showTemplatesRow])

  const applyTemplate = async () => {
    if (!selectedTemplate || !adapter?.loadStudyTemplate) return
    try {
      const tpl = await adapter.loadStudyTemplate(selectedTemplate)
      if (!tpl) {
        setTemplateError('Template not found')
        return
      }
      // Apply payload to whichever input mode is active. Built-in
      // indicators get calcParams; backend indicators get settings.
      if (isBackend && tpl.settings) {
        setSettings({ ...tpl.settings })
      } else if (!isBackend && tpl.calcParams) {
        setCalcParams([...tpl.calcParams])
      }
      setTemplateError(null)
    } catch (err) {
      setTemplateError((err as Error).message)
    }
  }

  const saveAsTemplate = async () => {
    if (!adapter?.saveStudyTemplate) return
    // eslint-disable-next-line no-alert
    const name = window.prompt('Save template as…', '')?.trim()
    if (!name) return
    try {
      const body: StudyTemplate = {
        name,
        indicatorName: params.indicatorName,
        ...(isBackend ? { settings } : { calcParams }),
      }
      await adapter.saveStudyTemplate(name, body)
      setSelectedTemplate(name)
      await refreshTemplateList()
      setTemplateError(null)
    } catch (err) {
      setTemplateError((err as Error).message)
    }
  }

  const deleteTemplate = async () => {
    if (!selectedTemplate || !adapter?.deleteStudyTemplate) return
    const meta = templateList.find(t => t.name === selectedTemplate)
    if (meta?.system) {
      setTemplateError('Cannot delete system template')
      return
    }
    try {
      await adapter.deleteStudyTemplate(selectedTemplate)
      setSelectedTemplate('')
      await refreshTemplateList()
      setTemplateError(null)
    } catch (err) {
      setTemplateError((err as Error).message)
    }
  }

  const selectedMeta = templateList.find(t => t.name === selectedTemplate)

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
        {showTemplatesRow && (
          <div className="superchart-indicator-setting-modal-row" style={{ flexWrap: 'wrap', gap: 6 }}>
            <span className="superchart-indicator-setting-modal-label">
              {i18n('template', locale) || 'Template'}
            </span>
            <Select
              value={selectedTemplate}
              dataSource={[
                { key: '', text: '— select —' },
                ...templateList.map(t => ({
                  key: t.name,
                  text: t.system ? `${t.name} (system)` : t.name,
                })),
              ]}
              onSelected={(item) => {
                const key = typeof item === 'string' ? item : item.key
                setSelectedTemplate(key)
              }}
            />
            <button
              type="button"
              disabled={!selectedTemplate}
              onClick={() => { void applyTemplate() }}
              style={{ padding: '4px 8px', fontSize: 12, cursor: selectedTemplate ? 'pointer' : 'not-allowed' }}
            >
              Apply
            </button>
            <button
              type="button"
              onClick={() => { void saveAsTemplate() }}
              style={{ padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}
            >
              Save as…
            </button>
            <button
              type="button"
              disabled={!selectedTemplate || !!selectedMeta?.system}
              title={selectedMeta?.system ? 'System templates cannot be deleted' : ''}
              onClick={() => { void deleteTemplate() }}
              style={{
                padding: '4px 8px',
                fontSize: 12,
                cursor: selectedTemplate && !selectedMeta?.system ? 'pointer' : 'not-allowed',
              }}
            >
              Delete
            </button>
            {templateError && (
              <span style={{ color: '#f88', fontSize: 11, width: '100%' }}>{templateError}</span>
            )}
          </div>
        )}
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
