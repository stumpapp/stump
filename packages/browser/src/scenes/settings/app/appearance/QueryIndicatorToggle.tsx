import { useUpdatePreferences } from '@stump/client'
import { UpdateUserPreferences } from '@stump/sdk'

import { useUserStore } from '@/stores'

import PreferenceToggle from '../../PreferenceToggle'

export default function QueryIndicatorToggle() {
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
				show_query_indicator: !preferences.show_query_indicator,
			} as UpdateUserPreferences)
		}
	}

	return (
		<PreferenceToggle
			formId="show_query_indicator"
			label="Background fetch indicator"
			description="Show a loading indicator whenever a query is running in the background"
			isChecked={preferences?.show_query_indicator}
			onToggle={handleChange}
		/>
	)
}
