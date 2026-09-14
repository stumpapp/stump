import { NewCard, RawSwitch } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useCallback } from 'react'

import { usePreferences } from '@/hooks/usePreferences'

export default function QueryIndicatorToggle() {
	const { t } = useLocaleContext()
	const {
		preferences: { showQueryIndicator },
		update,
	} = usePreferences()

	const handleChange = useCallback(() => {
		update({
			showQueryIndicator: !showQueryIndicator,
		})
	}, [showQueryIndicator, update])

	return (
		<NewCard.Row
			label={t(getKey('label'))}
			description={t(getKey('description'))}
			onClick={handleChange}
			className="flex-row items-center justify-between"
		>
			<RawSwitch
				id="showQueryIndicator"
				checked={showQueryIndicator}
				onCheckedChange={handleChange}
			/>
		</NewCard.Row>
	)
}

const LOCALE_BASE = 'settingsScene.app/preferences.sections.queryIndicatorToggle'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
