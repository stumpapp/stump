import { useLocaleContext } from '@stump/i18n'
import React from 'react'

import PreferenceToggle from '@/scenes/settings/PreferenceToggle'

export default function BundledServer() {
	const { t } = useLocaleContext()

	return (
		<PreferenceToggle
			label={t(getKey('label'))}
			description={t(getKey('description'))}
			isChecked={true}
			onToggle={() => {}}
		/>
	)
}

const LOCALE_KEY = 'settingsScene.app/desktop.sections.optionalFeatures.bundledServer'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
