import { useUpdatePreferences } from '@stump/client'
import { WideSwitch } from '@stump/components'
import { UpdateUserPreferences } from '@stump/sdk'

import { useUserStore } from '@/stores'

export default function EnableJobOverlayToggle() {
	const { preferences, setPreferences } = useUserStore((state) => ({
		preferences: state.userPreferences,
		setPreferences: state.setUserPreferences,
	}))

	const { update } = useUpdatePreferences({
		onSuccess: setPreferences,
	})

	const handleChange = () => {
		if (preferences) {
			update({
				...preferences,
				enable_job_overlay: !preferences.enable_job_overlay,
			} as UpdateUserPreferences)
		}
	}

	return (
		<WideSwitch
			formId="enable_job_overlay"
			label="Job overlay"
			description="Show a floating overlay while a job is running"
			checked={preferences?.enable_job_overlay}
			onCheckedChange={handleChange}
		/>
	)
}
