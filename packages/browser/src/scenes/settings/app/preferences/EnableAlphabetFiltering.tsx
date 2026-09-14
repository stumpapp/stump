import { NewCard, RawSwitch } from '@stump/components'
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
		<NewCard.Row
			label={t(getKey('label'))}
			description={t(getKey('description'))}
			onClick={handleChange}
			className="flex-row items-center justify-between"
		>
			<RawSwitch
				id="enableAlphabetSelect"
				checked={enableAlphabetSelect}
				onCheckedChange={handleChange}
			/>
		</NewCard.Row>
	)
}

const LOCALE_BASE = 'settingsScene.app/preferences.sections.enableAlphabetFiltering'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
