/**
 * Overlay Settings Modal
 *
 * Full property editor for overlay styling. Opens when the "Settings" button
 * is clicked in the floating toolbar or on double-click.
 *
 * Uses local state for field values so edits are instant (no async lag).
 * Syncs to overlay via modifyOverlayProperties() in the background.
 */

import { useState, useEffect, useSyncExternalStore } from 'react'
import { Color, Input, Select, Modal, type SelectDataSourceItem } from '../../component'
import { useChartState } from '../../hooks/useChartState'
import {
  popupOverlay,
  subscribePopupOverlay,
  setShowOverlaySetting,
  getOverlayType,
} from '../../store/overlaySettingStore'
import { setDefaultForOverlay } from '../../store/overlayDefaultStyles'
import {
  getOverlayPropertySchema,
  klineStylesToOverlayProperties,
  type PropertyFieldSchema,
} from './overlayPropertySchemas'
import type { ProOverlay } from '../../types/overlay'
import type { DeepPartial } from 'klinecharts'
import type { OverlayProperties } from '../../types/overlay'

import './index.less'

function OverlaySettingModal() {
  const overlay = useSyncExternalStore(subscribePopupOverlay, popupOverlay, popupOverlay) as ProOverlay | undefined
  const { modifyOverlayProperties } = useChartState()

  // Local state for property values — avoids async lag when editing
  const [localProps, setLocalProps] = useState<Record<string, unknown>>({})

  // Initialize local props when overlay changes
  useEffect(() => {
    if (!overlay) return
    const props = overlay.getProperties
      ? overlay.getProperties(overlay.id)
      : klineStylesToOverlayProperties(overlay.styles as Record<string, unknown> | undefined)
    setLocalProps(props as Record<string, unknown>)
  }, [overlay?.id])

  if (!overlay) return null

  const overlayName = overlay.name
  const schema = getOverlayPropertySchema(overlayName)

  const handleFieldChange = (field: PropertyFieldSchema, value: unknown) => {
    // Update local state immediately for instant feedback
    setLocalProps(prev => ({ ...prev, [field.key]: value }))
    // Persist and apply to chart asynchronously
    modifyOverlayProperties(overlay.id, { [field.key]: value } as DeepPartial<OverlayProperties>)
  }

  const handleApplyAsDefault = () => {
    setDefaultForOverlay(overlayName, localProps as DeepPartial<OverlayProperties>)
  }

  const handleClose = () => {
    setShowOverlaySetting(false)
  }

  return (
    <Modal
      title={`Style: ${getOverlayType()}`}
      onClose={handleClose}
      buttons={[
        { children: 'Apply as Default', type: 'cancel', onClick: handleApplyAsDefault },
        { children: 'Close', type: 'confirm', onClick: handleClose },
      ]}
    >
      <div className="superchart-overlay-setting-modal-content">
        <div className="content">
          {schema.sections.map(section => (
            <div key={section.title} className="section">
              <div className="section-title">{section.title}</div>
              {section.fields.map(field => {
                const value = localProps[field.key]
                return (
                  <div key={field.key} className="component">
                    <span>{field.label}</span>
                    <FieldEditor
                      field={field}
                      value={value}
                      onChange={(v) => handleFieldChange(field, v)}
                    />
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}

interface FieldEditorProps {
  field: PropertyFieldSchema
  value: unknown
  onChange: (value: unknown) => void
}

function FieldEditor({ field, value, onChange }: FieldEditorProps) {
  switch (field.editor) {
    case 'color':
      return (
        <Color
          style={{ width: 120 }}
          value={(value as string) ?? '#1677FF'}
          reactiveChange={true}
          onChange={onChange}
        />
      )
    case 'number':
      return (
        <Input
          style={{ width: 120 }}
          precision={0}
          min={field.min}
          max={field.max}
          value={value !== undefined ? Number(value) : (field.min ?? 1)}
          onChange={(v) => onChange(Number(v))}
        />
      )
    case 'select':
      return (
        <Select
          style={{ width: 120 }}
          value={String(value ?? field.options?.[0] ?? '')}
          dataSource={(field.options ?? []).map(opt => ({ key: opt, text: opt }))}
          onSelected={(item) => onChange(typeof item === 'string' ? item : (item as SelectDataSourceItem).key)}
        />
      )
    case 'dashedValue': {
      const arr = Array.isArray(value) ? value as number[] : [2, 2]
      return (
        <div style={{ display: 'flex', gap: 6, width: 120 }}>
          <Input
            style={{ width: 55 }}
            precision={1}
            min={0.5}
            max={20}
            value={arr[0] ?? 2}
            onChange={(v) => onChange([Number(v), arr[1] ?? 2])}
          />
          <Input
            style={{ width: 55 }}
            precision={1}
            min={0.5}
            max={20}
            value={arr[1] ?? 2}
            onChange={(v) => onChange([arr[0] ?? 2, Number(v)])}
          />
        </div>
      )
    }
    default:
      return null
  }
}

export default OverlaySettingModal
