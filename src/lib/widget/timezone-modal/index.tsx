/**
 * Timezone Modal Widget
 */

import { useState, useMemo } from 'react'
import { Modal, Select } from '../../component'
import type { SelectDataSourceItem } from '../../component'
import i18n from '../../i18n'
import { createTimezoneSelectOptions } from './data'

export interface TimezoneModalProps {
  locale: string
  timezone: SelectDataSourceItem
  onClose: () => void
  onConfirm: (timezone: SelectDataSourceItem) => void
}

export function TimezoneModal({
  locale,
  timezone,
  onClose,
  onConfirm,
}: TimezoneModalProps) {
  const [innerTimezone, setInnerTimezone] = useState(timezone)

  const timezoneOptions = useMemo(
    () => createTimezoneSelectOptions(locale),
    [locale]
  )

  return (
    <Modal
      title={i18n('timezone', locale)}
      width={320}
      buttons={[
        {
          children: i18n('confirm', locale),
          onClick: () => {
            onConfirm(innerTimezone)
            onClose()
          },
        },
      ]}
      onClose={onClose}
    >
      <Select
        style={{ width: '100%', marginTop: 20 }}
        value={innerTimezone.text}
        onSelected={(tz) => {
          setInnerTimezone(tz as SelectDataSourceItem)
        }}
        dataSource={timezoneOptions}
      />
    </Modal>
  )
}

export default TimezoneModal
