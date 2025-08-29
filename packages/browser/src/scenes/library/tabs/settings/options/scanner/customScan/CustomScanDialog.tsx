import { Button, Dialog } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useCallback, useState } from 'react'

import { ScanOptions } from '../history/ScanHistoryTable'
import ScanConfigForm, { FORM_ID } from './ScanConfigForm'

type Props = {
	onScan: (options: ScanOptions) => void
}

export default function CustomScanDialog({ onScan }: Props) {
	const { t } = useLocaleContext()
	const [isOpen, setIsOpen] = useState(false)

	const handleScan = useCallback(
		(options: ScanOptions) => {
			onScan(options)
			setIsOpen(false)
		},
		[onScan],
	)

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<Dialog.Trigger asChild>
				<Button size="sm">{t(getKey('heading'))}</Button>
			</Dialog.Trigger>
			<Dialog.Content>
				<Dialog.Header>
					<Dialog.Title>{t(getKey('heading'))}</Dialog.Title>
					<Dialog.Description>{t(getKey('description'))}</Dialog.Description>
				</Dialog.Header>

				<ScanConfigForm onScan={handleScan} />

				<Dialog.Footer>
					<Button onClick={() => setIsOpen(false)}>{t('common.cancel')}</Button>
					<Button type="submit" form={FORM_ID} variant="primary">
						{t('common.scan')}
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog>
	)
}

const LOCALE_BASE = 'librarySettingsScene.options/scanning.sections.configureScan'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
