import { WideSwitch } from '@stump/components'
import { useCallback } from 'react'

import { usePreferences } from '@/hooks/usePreferences'

export default function LiveRefetchToggle() {
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
			label="Live refetch"
			description="Refetch queries on the fly to hydrate the UI with new data as it comes in. This can be resource intensive"
			checked={enableLiveRefetch}
			onCheckedChange={handleChange}
		/>
	)
}
