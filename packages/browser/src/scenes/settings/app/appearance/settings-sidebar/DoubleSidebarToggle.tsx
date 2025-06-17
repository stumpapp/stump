import { WideSwitch } from '@stump/components'
import { useCallback } from 'react'

import { usePreferences } from '@/hooks'

export default function DoubleSidebarToggle() {
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
			label="Settings sidebar"
			description="Enables the sidebar navigation for the settings pages. If you frequently use a smaller screen, you may want to disable this."
			checked={enableDoubleSidebar}
			onCheckedChange={handleToggle}
			formId="enableDoubleSidebar"
		/>
	)
}
