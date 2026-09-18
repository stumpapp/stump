import { NewCard, RawSwitch } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useCallback } from 'react'

import { usePreferences } from '@/hooks'

export default function ReplacePrimarySidebarToggle() {
	const { t } = useLocaleContext()
	const {
		preferences: { enableReplacePrimarySidebar, enableDoubleSidebar, primaryNavigationMode },
		update,
	} = usePreferences()

	const handleToggle = useCallback(async () => {
		try {
			await update({ enableReplacePrimarySidebar: !enableReplacePrimarySidebar })
		} catch (error) {
			console.error(error)
		}
	}, [enableReplacePrimarySidebar, update])

	return (
		<NewCard.Row
			label={t(getKey('label'))}
			description={t(getKey('description'))}
			disabled={!enableDoubleSidebar || primaryNavigationMode !== 'SIDEBAR'}
			onClick={handleToggle}
			className="flex-row items-center justify-between"
			title={
				!enableDoubleSidebar
					? t(getKey('tooltips.doubleSidebar'))
					: primaryNavigationMode !== 'SIDEBAR'
						? t(getKey('tooltips.topbar'))
						: undefined
			}
		>
			<RawSwitch
				id="enableReplacePrimarySidebar"
				checked={enableReplacePrimarySidebar}
				disabled={!enableDoubleSidebar || primaryNavigationMode !== 'SIDEBAR'}
				onCheckedChange={handleToggle}
			/>
		</NewCard.Row>
	)
}

const LOCALE_BASE = 'settingsScene.app/preferences.sections.replacePrimarySidebar'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
