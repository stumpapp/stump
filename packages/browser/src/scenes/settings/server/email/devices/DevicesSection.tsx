import { Button, Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { RegisteredEmailDevice } from '@stump/types'
import React, { Suspense, useState } from 'react'

import CreateOrUpdateDeviceModal from './CreateOrUpdateDeviceModal'
import DevicesTable from './DevicesTable'

export default function DevicesSection() {
	const { t } = useLocaleContext()

	const [isCreatingDevice, setIsCreatingDevice] = useState(false)
	const [updatingDevice, setUpdatingDevice] = useState<RegisteredEmailDevice | null>(null)

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-end justify-between">
				<div>
					<Heading size="sm">{t('settingsScene.server/email.sections.devices.title')}</Heading>
					<Text size="sm" variant="muted" className="mt-1">
						{t('settingsScene.server/email.sections.devices.description')}
					</Text>
				</div>

				<Button variant="secondary" size="sm" onClick={() => setIsCreatingDevice(true)}>
					{t('settingsScene.server/email.sections.devices.addDevice')}
				</Button>
			</div>

			<Suspense fallback={null}>
				<DevicesTable onSelectForUpdate={setUpdatingDevice} />

				<CreateOrUpdateDeviceModal
					isOpen={isCreatingDevice || !!updatingDevice}
					updatingDevice={updatingDevice}
					onClose={() => {
						setIsCreatingDevice(false)
						setUpdatingDevice(null)
					}}
				/>
			</Suspense>
		</div>
	)
}
