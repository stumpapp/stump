import { Button, Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { Suspense, useState } from 'react'

import { useEmailerSettingsContext } from '../context'
import CreateOrUpdateDeviceModal from './CreateOrUpdateDeviceModal'
import DevicesTable, { RegisteredEmailDevice } from './DevicesTable'

export default function DevicesSection() {
	const { t } = useLocaleContext()
	const { canEditEmailer, canCreateEmailer } = useEmailerSettingsContext()

	const [isCreatingDevice, setIsCreatingDevice] = useState(false)
	const [updatingDevice, setUpdatingDevice] = useState<RegisteredEmailDevice | null>(null)

	const canCreateOrUpdate = canCreateEmailer || canEditEmailer

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-end justify-between">
				<div>
					<Heading size="sm">{t('settingsScene.server/email.sections.devices.title')}</Heading>
					<Text size="sm" variant="muted" className="mt-1">
						{t('settingsScene.server/email.sections.devices.description')}
					</Text>
				</div>

				{canCreateEmailer && (
					<Button
						className="shrink-0"
						variant="secondary"
						size="sm"
						onClick={() => setIsCreatingDevice(true)}
					>
						{t('settingsScene.server/email.sections.devices.addDevice')}
					</Button>
				)}
			</div>

			<Suspense fallback={null}>
				<DevicesTable onSelectForUpdate={setUpdatingDevice} />

				{canCreateOrUpdate && (
					<CreateOrUpdateDeviceModal
						isOpen={isCreatingDevice || !!updatingDevice}
						updatingDevice={canEditEmailer ? updatingDevice : null}
						onClose={() => {
							setIsCreatingDevice(false)
							setUpdatingDevice(null)
						}}
					/>
				)}
			</Suspense>
		</div>
	)
}
