import { Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'

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

			<LiveLogsFeed />
		</div>
	)
}
