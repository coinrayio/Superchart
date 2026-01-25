/**
 * Screenshot Modal Widget
 */

import { Modal } from '../../component'
import i18n from '../../i18n'

export interface ScreenshotModalProps {
  locale: string
  url: string
  onClose: () => void
}

export function ScreenshotModal({ locale, url, onClose }: ScreenshotModalProps) {
  const handleSave = () => {
    const a = document.createElement('a')
    a.download = 'screenshot'
    a.href = url
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  return (
    <Modal
      title={i18n('screenshot', locale)}
      width={540}
      buttons={[
        {
          type: 'confirm',
          children: i18n('save', locale),
          onClick: handleSave,
        },
      ]}
      onClose={onClose}
    >
      <img style={{ width: 500, marginTop: 20 }} src={url} alt="Screenshot" />
    </Modal>
  )
}

export default ScreenshotModal
