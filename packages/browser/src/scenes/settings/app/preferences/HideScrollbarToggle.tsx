import { NewCard, RawSwitch } from '@stump/components'
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
		<NewCard.Row
			label={t(getKey('label'))}
			description={t(getKey('description'))}
			onClick={handleToggle}
			className="flex-row items-center justify-between"
			title={enableHideScrollbar ? t(getKey('tooltips.enabled')) : t(getKey('tooltips.disabled'))}
		>
			<RawSwitch
				id="enableHideScrollbar"
				checked={enableHideScrollbar}
				onCheckedChange={handleToggle}
			/>
		</NewCard.Row>
	)
}

const LOCALE_BASE = 'settingsScene.app/preferences.sections.hideScrollbarToggle'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
