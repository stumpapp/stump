import { usePreferences } from '@/hooks'
import React, { useCallback } from 'react'

import PreferenceToggle from './PreferenceToggle'

export default function HideScrollbarToggle() {
	const {
		preferences: { enable_hide_scrollbar },
		update,
	} = usePreferences()

	const handleToggle = useCallback(async () => {
		try {
			await update({ enable_hide_scrollbar: !enable_hide_scrollbar })
		} catch (error) {
			console.error(error)
		}
	}, [enable_hide_scrollbar, update])

	return (
		<PreferenceToggle
			label="Hide scrollbar"
			description="Some pages simply look better without a scrollbar, this setting will hide it when possible"
			isChecked={enable_hide_scrollbar}
			onToggle={handleToggle}
			formId="enable_hide_scrollbar"
			title={
				enable_hide_scrollbar
					? 'This setting will hide the scrollbar on some pages'
					: 'This setting will show the scrollbar on some pages'
			}
		/>
	)
}
