import { WideSwitch } from '@stump/components'
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
		<WideSwitch
			formId="enableLiveRefetch"
			label={t(getKey('label'))}
			description={t(getKey('description'))}
			checked={enableLiveRefetch}
			onCheckedChange={handleChange}
		/>
	)
}

const LOCALE_BASE = 'settingsScene.app/preferences.sections.liveRefetchToggle'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
