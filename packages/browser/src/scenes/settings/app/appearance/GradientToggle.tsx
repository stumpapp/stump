import { useUpdatePreferences } from '@stump/client'

import { useUserStore } from '@/stores'

import PreferenceToggle from '../../PreferenceToggle'

export default function GradientToggle() {
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
				enable_gradients: !preferences.enable_gradients,
			})
		}
	}

	return (
		<PreferenceToggle
			formId="enable_gradients"
			label="Enable gradients"
			description="Some themes optionally support gradients for a more dynamic look"
			isChecked={preferences?.enable_gradients}
			onToggle={handleChange}
		/>
	)
}
