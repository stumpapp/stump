import { Link, Text } from '@stump/components'
import { useMemo } from 'react'

import { useLocaleContext } from '../../../i18n/context'
import { SettingsSubSection } from '../SettingsLayout'
import LocaleSelector from './LocaleSelector'

export default function LocalePreferences() {
	const { t } = useLocaleContext()

	const subTitle = useMemo(() => {
		const pieces = [
			t('settingsScene.general.locale.subtitle.0'),
			t('settingsScene.general.locale.subtitle.1'),
			t('settingsScene.general.locale.subtitle.2'),
		]

		return (
			<Text size="sm" variant="muted" className="mt-1.5">
				{pieces[0]} <Link href="https://stumpapp.dev/contributing#translation">{pieces[1]}</Link>{' '}
				{pieces[2]}
			</Text>
		)
	}, [t])

	return (
		<div className="pb-2">
			<SettingsSubSection heading={t('settingsScene.general.locale.heading')} subtitle={subTitle}>
				<div className="flex max-w-2xl flex-col gap-3 divide-y divide-gray-75 pt-2 dark:divide-gray-900">
					<LocaleSelector />
				</div>
			</SettingsSubSection>
		</div>
	)
}
