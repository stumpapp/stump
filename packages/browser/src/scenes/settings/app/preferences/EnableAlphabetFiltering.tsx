import { WideSwitch } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useCallback } from 'react'

import { usePreferences } from '@/hooks/usePreferences'

export default function EnableAlphabetFiltering() {
	const { t } = useLocaleContext()
	const {
		preferences: { enableAlphabetSelect },
		update,
	} = usePreferences()

	const handleChange = useCallback(() => {
		update({
			enableAlphabetSelect: !enableAlphabetSelect,
		})
	}, [enableAlphabetSelect, update])

	return (
		<WideSwitch
			formId="enableAlphabetSelect"
			label={t(getKey('label'))}
			description={t(getKey('description'))}
			checked={enableAlphabetSelect}
			onCheckedChange={handleChange}
		/>
	)
}

const LOCALE_BASE = 'settingsScene.app/preferences.sections.enableAlphabetFiltering'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
