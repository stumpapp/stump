import { Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import React from 'react'

import BundledServer from './BundledServer'
import DiscordPresenceSwitch from './DiscordPresenceSwitch'

export default function OptionalFeaturesSection() {
	const { t } = useLocaleContext()

	return (
		<div className="flex flex-col gap-y-6">
			<div>
				<Heading size="sm">{t(getKey('label'))}</Heading>
				<Text variant="muted" size="sm">
					{t(getKey('description'))}
				</Text>
			</div>

			<BundledServer />
			<DiscordPresenceSwitch />
		</div>
	)
}

const LOCALE_KEY = 'settingsScene.app/desktop.sections.optionalFeatures'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
