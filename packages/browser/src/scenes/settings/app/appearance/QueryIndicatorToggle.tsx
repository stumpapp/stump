import { WideSwitch } from '@stump/components'
import { useCallback } from 'react'

import { usePreferences } from '@/hooks/usePreferences'

export default function QueryIndicatorToggle() {
	const {
		preferences: { showQueryIndicator },
		update,
	} = usePreferences()

	const handleChange = useCallback(() => {
		update({
			showQueryIndicator: !showQueryIndicator,
		})
	}, [showQueryIndicator, update])

	return (
		<WideSwitch
			formId="showQueryIndicator"
			label="Background fetch indicator"
			description="Show a loading indicator whenever a query is running in the background"
			checked={showQueryIndicator}
			onCheckedChange={handleChange}
		/>
	)
}
