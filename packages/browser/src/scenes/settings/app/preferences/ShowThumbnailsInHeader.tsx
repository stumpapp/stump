import { WideSwitch } from '@stump/components'
import { useCallback } from 'react'

import { usePreferences } from '@/hooks'

export default function ShowThumbnailsInHeader() {
	const {
		preferences: { showThumbnailsInHeaders },
		update,
	} = usePreferences()

	const handleToggle = useCallback(async () => {
		try {
			await update({ showThumbnailsInHeaders: !showThumbnailsInHeaders })
		} catch (error) {
			console.error(error)
		}
	}, [showThumbnailsInHeaders, update])

	return (
		<WideSwitch
			label="Show thumbnails in headers"
			description="If you prefer to see thumbnails more often, this setting will show them in more places"
			checked={showThumbnailsInHeaders}
			onCheckedChange={handleToggle}
			formId="showThumbnailsInHeaders"
			title={
				showThumbnailsInHeaders
					? 'This setting will show thumbnails in more places'
					: 'This setting will not show thumbnails in more places'
			}
		/>
	)
}
