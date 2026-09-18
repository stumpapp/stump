import { NewCard, RawSwitch } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useCallback } from 'react'

import { usePreferences } from '@/hooks/usePreferences'

export default function GradientToggle() {
	const { t } = useLocaleContext()
	const {
		preferences: { enableGradients },
		update,
	} = usePreferences()

	const handleChange = useCallback(() => {
		update({
			enableGradients: !enableGradients,
		})
	}, [enableGradients, update])

	return (
		<NewCard.Row
			label={t(getKey('label'))}
			description={t(getKey('description'))}
			onClick={handleChange}
			className="flex-row items-center justify-between"
		>
			<RawSwitch id="enableGradients" checked={enableGradients} onCheckedChange={handleChange} />
		</NewCard.Row>
	)
}

const LOCALE_BASE = 'settingsScene.app/preferences.sections.gradientToggle'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
