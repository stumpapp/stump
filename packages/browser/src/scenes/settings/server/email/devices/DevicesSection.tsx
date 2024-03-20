import { Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import React, { Suspense } from 'react'

import DevicesTable from './DevicesTable'

export default function DevicesSection() {
	const { t } = useLocaleContext()

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Heading size="sm">{t('settingsScene.server/email.sections.devices.title')}</Heading>
				<Text size="sm" variant="muted" className="mt-1">
					{t('settingsScene.server/email.sections.devices.description')}
				</Text>
			</div>

			<Suspense fallback={null}>
				<DevicesTable />
			</Suspense>
		</div>
	)
}
