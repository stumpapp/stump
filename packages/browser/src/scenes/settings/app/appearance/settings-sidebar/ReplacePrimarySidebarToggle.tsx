import { WideSwitch } from '@stump/components'
import { useCallback } from 'react'

import { usePreferences } from '@/hooks'

export default function ReplacePrimarySidebarToggle() {
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
		<WideSwitch
			label="Replace primary sidebar"
			description="Any instance of a secondary sidebar will replace the primary sidebar instead of being displayed next to it"
			checked={enableReplacePrimarySidebar}
			disabled={!enableDoubleSidebar || primaryNavigationMode !== 'SIDEBAR'}
			onCheckedChange={handleToggle}
			formId="enableReplacePrimarySidebar"
			title={
				!enableDoubleSidebar
					? 'This setting requires the double sidebar to be changed'
					: primaryNavigationMode !== 'SIDEBAR'
						? 'This setting is not currently supported when the primary navigation is set to top bar'
						: undefined
			}
		/>
	)
}
