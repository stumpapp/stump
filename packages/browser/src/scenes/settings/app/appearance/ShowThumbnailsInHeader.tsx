import { useCallback } from 'react'

import { usePreferences } from '@/hooks'

import PreferenceToggle from '../../PreferenceToggle'

export default function ShowThumbnailsInHeader() {
	const {
		preferences: { show_thumbnails_in_headers },
		update,
	} = usePreferences()

	const handleToggle = useCallback(async () => {
		try {
			await update({ show_thumbnails_in_headers: !show_thumbnails_in_headers })
		} catch (error) {
			console.error(error)
		}
	}, [show_thumbnails_in_headers, update])

	return (
		<PreferenceToggle
			label="Show thumbnails in headers"
			description="If you prefer to see thumbnails more often, this setting will show them in more places"
			isChecked={show_thumbnails_in_headers}
			onToggle={handleToggle}
			formId="show_thumbnails_in_headers"
			title={
				show_thumbnails_in_headers
					? 'This setting will show thumbnails in more places'
					: 'This setting will not show thumbnails in more places'
			}
		/>
	)
}
