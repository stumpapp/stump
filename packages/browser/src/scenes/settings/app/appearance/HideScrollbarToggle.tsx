import { WideSwitch } from '@stump/components'
import { useCallback } from 'react'

import { usePreferences } from '@/hooks'

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
		<WideSwitch
			label="Hide scrollbar"
			description="Some pages simply look better without a scrollbar, this setting will hide it when possible"
			checked={enable_hide_scrollbar}
			onCheckedChange={handleToggle}
			formId="enable_hide_scrollbar"
			title={
				enable_hide_scrollbar
					? 'This setting will hide the scrollbar on some pages'
					: 'This setting will show the scrollbar on some pages'
			}
		/>
	)
}
