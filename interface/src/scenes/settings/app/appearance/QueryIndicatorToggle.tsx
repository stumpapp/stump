import { useUpdatePreferences, useUserStore } from '@stump/client'
import { Label, RawSwitch, Text } from '@stump/components'
import React from 'react'

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
			})
		}
	}

	return (
		<>
			<div className="flex items-center justify-between py-6">
				<div className="flex flex-grow flex-col gap-2 text-left">
					<Label htmlFor="show_query_indicator">Show background loading indicator</Label>
					<Text size="xs" variant="muted" className=" max-w-[80%]">
						Show a loading indicator when a query is running in the background. This is available
						for those who are curious about what is happening behind the scenes.
					</Text>
				</div>

				<div className="w-6" />

				<RawSwitch
					id="show_query_indicator"
					className="text-gray-900"
					checked={preferences?.show_query_indicator}
					onClick={handleChange}
					primaryRing
				/>
			</div>
		</>
	)
}
