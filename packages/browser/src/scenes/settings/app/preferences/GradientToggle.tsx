import { WideSwitch } from '@stump/components'
import { useCallback } from 'react'

import { usePreferences } from '@/hooks/usePreferences'

export default function GradientToggle() {
	const {
		preferences: { enableGradients },
		update,
	} = usePreferences()

	const handleChange = useCallback(() => {
		update({
			enableGradients: !enableGradients,
		})
	}, [enableGradients, update])

	return (
		<WideSwitch
			formId="enableGradients"
			label="Enable gradients"
			description="Some themes optionally support gradients for a more dynamic look"
			checked={enableGradients}
			onCheckedChange={handleChange}
		/>
	)
}
