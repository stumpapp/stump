import { NewCard, RawSwitch } from '@stump/components'
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
		<NewCard.Row
			label={t(getKey('label'))}
			description={t(getKey('description'))}
			onClick={handleToggle}
			className="flex-row items-center justify-between"
			title={
				showThumbnailsInHeaders ? t(getKey('tooltips.enabled')) : t(getKey('tooltips.disabled'))
			}
		>
			<RawSwitch
				id="showThumbnailsInHeaders"
				checked={showThumbnailsInHeaders}
				onCheckedChange={handleToggle}
			/>
		</NewCard.Row>
	)
}

const LOCALE_BASE = 'settingsScene.app/preferences.sections.showThumbnailsInHeader'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
