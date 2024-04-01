import { useUpdatePreferences } from '@stump/client'
import React from 'react'

import { useUserStore } from '@/stores'

import PreferenceToggle from '../../PreferenceToggle'

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
		<PreferenceToggle
			formId="enable_live_refetch"
			label="Live refetch"
			description="Refetch queries on the fly to hydrate the UI with new data as it comes in. This can be resource intensive"
			isChecked={preferences?.enable_live_refetch}
			onToggle={handleChange}
		/>
	)
}
