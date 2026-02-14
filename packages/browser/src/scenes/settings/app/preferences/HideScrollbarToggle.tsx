import { WideSwitch } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useCallback } from 'react'

import { usePreferences } from '@/hooks'

export default function HideScrollbarToggle() {
	const { t } = useLocaleContext()
	const {
		preferences: { enableHideScrollbar },
		update,
	} = usePreferences()

	const handleToggle = useCallback(async () => {
		try {
			await update({ enableHideScrollbar: !enableHideScrollbar })
		} catch (error) {
			console.error(error)
		}
	}, [enableHideScrollbar, update])

	return (
		<WideSwitch
			label={t(getKey('label'))}
			description={t(getKey('description'))}
			checked={enableHideScrollbar}
			onCheckedChange={handleToggle}
			formId="enableHideScrollbar"
			title={enableHideScrollbar ? t(getKey('tooltips.enabled')) : t(getKey('tooltips.disabled'))}
		/>
	)
}

const LOCALE_BASE = 'settingsScene.app/preferences.sections.hideScrollbarToggle'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
