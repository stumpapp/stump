import { NewCard, RawSwitch } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useCallback } from 'react'

import { usePreferences } from '@/hooks/usePreferences'

export default function LiveRefetchToggle() {
	const { t } = useLocaleContext()
	const {
		preferences: { enableLiveRefetch },
		update,
	} = usePreferences()

	const handleChange = useCallback(() => {
		update({
			enableLiveRefetch: !enableLiveRefetch,
		})
	}, [enableLiveRefetch, update])

	return (
		<NewCard.Row
			label={t(getKey('label'))}
			description={t(getKey('description'))}
			onClick={handleChange}
			className="flex-row items-center justify-between"
		>
			<RawSwitch
				id="enableLiveRefetch"
				checked={enableLiveRefetch}
				onCheckedChange={handleChange}
			/>
		</NewCard.Row>
	)
}

const LOCALE_BASE = 'settingsScene.app/preferences.sections.liveRefetchToggle'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
