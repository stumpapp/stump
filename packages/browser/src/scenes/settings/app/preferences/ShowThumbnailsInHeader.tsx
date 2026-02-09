import { WideSwitch } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useCallback } from 'react'

import { usePreferences } from '@/hooks'

export default function ShowThumbnailsInHeader() {
	const { t } = useLocaleContext()
	const {
		preferences: { showThumbnailsInHeaders },
		update,
	} = usePreferences()

	const handleToggle = useCallback(async () => {
		try {
			await update({ showThumbnailsInHeaders: !showThumbnailsInHeaders })
		} catch (error) {
			console.error(error)
		}
	}, [showThumbnailsInHeaders, update])

	return (
		<WideSwitch
			label={t(getKey('label'))}
			description={t(getKey('description'))}
			checked={showThumbnailsInHeaders}
			onCheckedChange={handleToggle}
			formId="showThumbnailsInHeaders"
			title={
				showThumbnailsInHeaders ? t(getKey('tooltips.enabled')) : t(getKey('tooltips.disabled'))
			}
		/>
	)
}

const LOCALE_BASE = 'settingsScene.app/preferences.sections.showThumbnailsInHeader'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
