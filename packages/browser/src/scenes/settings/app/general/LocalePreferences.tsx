import { Heading, Link, Text } from '@stump/components'
import { useMemo } from 'react'

import { useLocaleContext } from '../../../../i18n/context'
import LocaleSelector from './LocaleSelector'

export default function LocalePreferences() {
	const { t } = useLocaleContext()

	const subTitle = useMemo(() => {
		const pieces = [
			t('settingsScene.app/account.sections.locale.subtitle.0'),
			t('settingsScene.app/account.sections.locale.subtitle.1'),
			t('settingsScene.app/account.sections.locale.subtitle.2'),
		]

		return (
			<Text size="sm" variant="muted" className="mt-1.5">
				{pieces[0]} <Link href="https://stumpapp.dev/contributing#translation">{pieces[1]}</Link>{' '}
				{pieces[2]}
			</Text>
		)
	}, [t])

	return (
		<div className="flex flex-col gap-y-4">
			<div>
				<Heading size="sm">{t('settingsScene.app/account.sections.locale.heading')}</Heading>
				{subTitle}
			</div>

			<LocaleSelector />
		</div>
	)
}
