import { WideSwitch } from '@stump/components'
import { useCallback } from 'react'

import { usePreferences } from '@/hooks'

export default function HideScrollbarToggle() {
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
			label="Hide scrollbar"
			description="Some pages simply look better without a scrollbar, this setting will hide it when possible"
			checked={enableHideScrollbar}
			onCheckedChange={handleToggle}
			formId="enableHideScrollbar"
			title={
				enableHideScrollbar
					? 'This setting will hide the scrollbar on some pages'
					: 'This setting will show the scrollbar on some pages'
			}
		/>
	)
}
