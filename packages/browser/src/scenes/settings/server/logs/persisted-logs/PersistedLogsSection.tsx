import { Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { Suspense } from 'react'

import DeleteLogsConfirmationDialog from './DeleteLogsConfirmationDialog'
import PersistedLogsTable from './PersistedLogsTable'

export default function PersistedLogsSection() {
	const { t } = useLocaleContext()

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-end justify-between">
				<div>
					<Heading size="sm">{t(getKey('title'))}</Heading>
					<Text size="sm" variant="muted" className="mt-1">
						{t(getKey('description'))}
					</Text>
				</div>

				<div className="flex shrink-0 justify-end">
					<DeleteLogsConfirmationDialog />
				</div>
			</div>

			<Suspense>
				<PersistedLogsTable />
			</Suspense>
		</div>
	)
}
const LOCALE_BASE = 'settingsScene.server/logs.sections.persistedLogs'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
