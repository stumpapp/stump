import React from 'react'

import { SettingsSubSection } from '../SettingsLayout'
import QueryIndicatorToggle from './QueryIndicatorToggle'

export default function UiPreferences() {
	return (
		<div>
			<SettingsSubSection
				heading="UI Preferences"
				subtitle="Various options to customize the UI to your liking"
			>
				<div className="flex max-w-2xl flex-col gap-3 divide-y divide-gray-75 dark:divide-gray-900">
					<QueryIndicatorToggle />
				</div>
			</SettingsSubSection>
		</div>
	)
}
