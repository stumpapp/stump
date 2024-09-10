import { useLocaleContext } from '@stump/i18n'
import React, { useCallback } from 'react'

import PreferenceToggle from '@/scenes/settings/PreferenceToggle'
import { useTauriStore } from '@/stores'

export default function BundledServer() {
	const { t } = useLocaleContext()
	const { run_bundled_server, setRunBundledServer } = useTauriStore()

	const handleChange = useCallback(
		() => setRunBundledServer(!run_bundled_server),
		[run_bundled_server, setRunBundledServer],
	)

	return (
		<PreferenceToggle
			label={t(getKey('label'))}
			description={t(getKey('description'))}
			isChecked={run_bundled_server}
			onToggle={handleChange}
		/>
	)
}

const LOCALE_KEY = 'settingsScene.app/desktop.sections.optionalFeatures.bundledServer'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
