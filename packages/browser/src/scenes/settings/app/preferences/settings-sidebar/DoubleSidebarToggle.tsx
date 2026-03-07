import { WideSwitch } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useCallback } from 'react'

import { usePreferences } from '@/hooks'

export default function DoubleSidebarToggle() {
	const { t } = useLocaleContext()
	const {
		preferences: { enableDoubleSidebar },
		update,
	} = usePreferences()

	const handleToggle = useCallback(async () => {
		try {
			await update({ enableDoubleSidebar: !enableDoubleSidebar })
		} catch (error) {
			console.error(error)
		}
	}, [enableDoubleSidebar, update])

	return (
		<WideSwitch
			label={t(getKey('label'))}
			description={t(getKey('description'))}
			checked={enableDoubleSidebar}
			onCheckedChange={handleToggle}
			formId="enableDoubleSidebar"
		/>
	)
}

const LOCALE_BASE = 'settingsScene.app/preferences.sections.doubleSidebar'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
