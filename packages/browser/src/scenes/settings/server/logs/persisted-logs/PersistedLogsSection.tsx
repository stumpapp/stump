import { Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import React from 'react'

import PersistedLogsTable from './PersistedLogsTable'

export default function PersistedLogsSection() {
	const { t } = useLocaleContext()
	return (
		<div className="flex flex-col gap-4">
			<div>
				<Heading size="sm">{t('settingsScene.server/logs.sections.persistedLogs.title')}</Heading>
				<Text size="sm" variant="muted" className="mt-1">
					{t('settingsScene.server/logs.sections.persistedLogs.description')}
				</Text>
			</div>

			<PersistedLogsTable />
		</div>
	)
}
