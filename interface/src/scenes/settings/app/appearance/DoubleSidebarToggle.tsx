import React from 'react'

import PreferenceToggle from './PreferenceToggle'

export default function DoubleSidebarToggle() {
	const handleChange = () => {}

	return (
		<PreferenceToggle
			label="Double sidebar"
			description="Enables the double sidebar in the settings pages. If you have a small screen, you may want to disable this."
			isChecked={true}
			onToggle={handleChange}
			isDisabled
			formId="enable_double_sidebar"
		/>
	)
}
