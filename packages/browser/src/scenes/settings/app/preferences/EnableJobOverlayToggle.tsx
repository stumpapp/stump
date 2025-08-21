import { WideSwitch } from '@stump/components'
import { useCallback } from 'react'

import { usePreferences } from '@/hooks/usePreferences'

export default function EnableJobOverlayToggle() {
	const {
		preferences: { enableJobOverlay },
		update,
	} = usePreferences()

	const handleChange = useCallback(() => {
		update({
			enableJobOverlay: !enableJobOverlay,
		})
	}, [enableJobOverlay, update])

	return (
		<WideSwitch
			formId="enableJobOverlay"
			label="Job overlay"
			description="Show a floating overlay while a job is running"
			checked={enableJobOverlay}
			onCheckedChange={handleChange}
		/>
	)
}
