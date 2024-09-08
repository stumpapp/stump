import { Heading, Text } from '@stump/components'
import React from 'react'

import DiscordPresenceSwitch from '../DiscordPresenceSwitch'

export default function OptionalFeaturesSection() {
	return (
		<div className="flex flex-col gap-y-4">
			<div>
				<Heading size="sm">
					{/* {t(getSectionKey('optionalFeatures.label'))} */}
					Optional features
				</Heading>
				<Text variant="muted" size="sm">
					{/* {t(getSectionKey('optionalFeatures.description'))} */}
					Enable or disable optional features unique to the Stump desktop app
				</Text>
			</div>

			<DiscordPresenceSwitch />
		</div>
	)
}
