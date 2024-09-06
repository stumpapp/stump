import { Alert, Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import React, { Suspense } from 'react'

import EmailersList from './EmailersList'

export default function EmailersSection() {
	const { t } = useLocaleContext()

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Heading size="sm">{t('settingsScene.server/email.sections.emailers.title')}</Heading>
				<Text size="sm" variant="muted" className="mt-1">
					{t('settingsScene.server/email.sections.emailers.description')}
				</Text>
			</div>

			<Alert rounded="sm" level="info">
				<Alert.Content>
					<Text variant="muted">
						{t('settingsScene.server/email.sections.emailers.singleInstanceDisclaimer')}
					</Text>
				</Alert.Content>
			</Alert>

			<Suspense fallback={null}>
				<EmailersList />
			</Suspense>
		</div>
	)
}
