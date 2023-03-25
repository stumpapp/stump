import { Divider, Heading, Text } from '@stump/components'

import { useLocaleContext } from '../../../i18n/context'
import LocaleSelector from './LocaleSelector'

export default function LocalePreferences() {
	const { t } = useLocaleContext()

	return (
		<div>
			<Heading size="xs">{t('settingsScene.general.locale.heading')}</Heading>
			<Text size="sm" variant="muted" className="mt-1.5">
				{t('settingsScene.general.locale.subtitle')}
			</Text>

			<Divider variant="muted" className="my-3.5" />

			<div className="flex max-w-2xl flex-col gap-3 divide-y divide-gray-75 pt-6 dark:divide-gray-900">
				<LocaleSelector />
			</div>
		</div>
	)
}
