import { Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'

import RemoveAllTokensConfirm from './RemoveAllTokensConfirm'

type Props = {
	onConfirmClear: () => Promise<void>
}

export default function RemoveAllTokensSection({ onConfirmClear }: Props) {
	const { t } = useLocaleContext()

	return (
		<div className="flex flex-col space-y-4">
			<div>
				<Heading size="xs">{t(getKey('label'))}</Heading>
				<Text size="sm" variant="muted" className="mt-1">
					{t(getKey('description.0'))}. <b>{t(getKey('description.1'))}</b>
				</Text>
			</div>

			<RemoveAllTokensConfirm onConfirmClear={onConfirmClear} />
		</div>
	)
}

const LOCALE_KEY = 'settingsScene.app/desktop.sections.configuredServers.resetTokens'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
