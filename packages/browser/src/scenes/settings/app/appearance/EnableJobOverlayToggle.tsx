import { useUpdatePreferences } from '@stump/client'
import { UpdateUserPreferences } from '@stump/sdk'

import { useUserStore } from '@/stores'

import PreferenceToggle from '../../PreferenceToggle'

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
		<PreferenceToggle
			formId="enable_job_overlay"
			label="Job overlay"
			description="Show a floating overlay while a job is running"
			isChecked={preferences?.enable_job_overlay}
			onToggle={handleChange}
		/>
	)
}
