import React from 'react'

import PreferenceToggle from './PreferenceToggle'

// TODO: Implement this
export default function PreferColorToggle() {
	const handleChange = () => {}

	return (
		<PreferenceToggle
			label="Prefer colors"
			description="Display more of the main accent color instead of monochrome colors"
			isChecked={true}
			onToggle={handleChange}
			isDisabled
			formId="prefer_accent_color"
			title="This setting is not currently supported"
		/>
	)
}
