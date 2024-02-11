import { usePreferences } from '@stump/client'
import React, { useCallback } from 'react'

import PreferenceToggle from './PreferenceToggle'

export default function DoubleSidebarToggle() {
	const {
		preferences: { enable_double_sidebar },
		update,
	} = usePreferences()

	const handleToggle = useCallback(async () => {
		try {
			await update({ enable_double_sidebar: !enable_double_sidebar })
		} catch (error) {
			console.error(error)
		}
	}, [enable_double_sidebar, update])

	return (
		<PreferenceToggle
			label="Settings sidebar"
			description="Enables the sidebar navigation for the settings pages. If you frequently use a smaller screen, you may want to disable this."
			isChecked={enable_double_sidebar}
			onToggle={handleToggle}
			formId="enable_double_sidebar"
		/>
	)
}
