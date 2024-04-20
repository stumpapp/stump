import { Alert, Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { Construction } from 'lucide-react'
import React from 'react'

import LiveLogsFeed from './LiveLogsFeed'

export default function LiveLogsSection() {
	const { t } = useLocaleContext()
	return (
		<div className="flex flex-col gap-4">
			<div>
				<Heading size="sm">{t('settingsScene.server/logs.sections.liveLogs.title')}</Heading>
				<Text size="sm" variant="muted" className="mt-1">
					{t('settingsScene.server/logs.sections.liveLogs.description')}
				</Text>
			</div>

			<Alert level="warning" rounded="sm" icon={Construction}>
				<Alert.Content>{t('common.limitedFunctionality')}</Alert.Content>
			</Alert>

			<LiveLogsFeed />
		</div>
	)
}
