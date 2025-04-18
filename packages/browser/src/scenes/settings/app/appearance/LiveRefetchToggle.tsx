import { useUpdatePreferences } from '@stump/client'
import { WideSwitch } from '@stump/components'

import { useUserStore } from '@/stores'

export default function LiveRefetchToggle() {
	const { preferences, setPreferences } = useUserStore((state) => ({
		preferences: state.userPreferences,
		setPreferences: state.setUserPreferences,
	}))

	const { unsafePatch } = useUpdatePreferences({
		onSuccess: setPreferences,
	})

	const handleChange = () => {
		if (preferences) {
			unsafePatch({
				...preferences,
				enable_live_refetch: !preferences.enable_live_refetch,
			})
		}
	}

	return (
		<WideSwitch
			formId="enable_live_refetch"
			label="Live refetch"
			description="Refetch queries on the fly to hydrate the UI with new data as it comes in. This can be resource intensive"
			checked={preferences?.enable_live_refetch}
			onCheckedChange={handleChange}
		/>
	)
}
