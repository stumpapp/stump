import React from 'react'

import ApplicationVersion from './ApplicationVersion'
import SettingsButton from './Settings'

export default function SideBarFooter() {
	return (
		<footer className="flex flex-col gap-1.5">
			<div className="flex items-center justify-between">
				<SettingsButton />
			</div>
			<ApplicationVersion />
		</footer>
	)
}
