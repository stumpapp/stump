import { WideSwitch } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useCallback } from 'react'

import { usePreferences } from '@/hooks/usePreferences'

export default function EnableJobOverlayToggle() {
	const { t } = useLocaleContext()
	const {
		preferences: { enableJobOverlay },
		update,
	} = usePreferences()

	const handleChange = useCallback(() => {
		update({
			enableJobOverlay: !enableJobOverlay,
		})
	}, [enableJobOverlay, update])

	return (
		<WideSwitch
			formId="enableJobOverlay"
			label={t(getKey('label'))}
			description={t(getKey('description'))}
			checked={enableJobOverlay}
			onCheckedChange={handleChange}
		/>
	)
}

const LOCALE_BASE = 'settingsScene.app/preferences.sections.enableJobOverlayToggle'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
