import { useUpdatePreferences } from '@stump/client'
import { WideSwitch } from '@stump/components'

import { useUserStore } from '@/stores'

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
		<WideSwitch
			formId="enable_gradients"
			label="Enable gradients"
			description="Some themes optionally support gradients for a more dynamic look"
			checked={preferences?.enable_gradients}
			onCheckedChange={handleChange}
		/>
	)
}
