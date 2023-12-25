import { usePreferences } from '@stump/client'
import React, { useCallback } from 'react'

import PreferenceToggle from './PreferenceToggle'

export default function ReplacePrimarySidebarToggle() {
	const {
		preferences: { enable_replace_primary_sidebar, enable_double_sidebar },
		update,
	} = usePreferences()

	const handleToggle = useCallback(async () => {
		try {
			await update({ enable_replace_primary_sidebar: !enable_replace_primary_sidebar })
		} catch (error) {
			console.error(error)
		}
	}, [enable_replace_primary_sidebar, update])

	return (
		<PreferenceToggle
			label="Replace primary sidebar"
			description="Any instance of a secondary sidebar will replace the primary sidebar instead of being displayed next to it"
			isChecked={enable_replace_primary_sidebar}
			isDisabled={!enable_double_sidebar}
			onToggle={handleToggle}
			formId="enable_replace_primary_sidebar"
		/>
	)
}
