import { Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'

import ResetConfigurationConfirmation from './ResetConfigurationConfirmation'

type Props = {
	onConfirmReset: () => Promise<void>
}

export default function ResetConfiguredServersSection({ onConfirmReset }: Props) {
	const { t } = useLocaleContext()

	return (
		<div className="flex flex-col space-y-4">
			<div>
				<Heading size="xs">{t(getKey('label'))}</Heading>
				<Text size="sm" variant="muted" className="mt-1">
					{t(getKey('description.0'))}. <b>{t(getKey('description.1'))}</b>
				</Text>
			</div>

			<ResetConfigurationConfirmation onConfirmReset={onConfirmReset} />
		</div>
	)
}

const LOCALE_KEY = 'settingsScene.app/desktop.sections.configuredServers.resetConfiguration'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
