import { NewCard } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'

import ServerEmojisSection from './ServerEmojisSection'
import ServerPublicURL from './ServerPublicURL'

export function ServerConfiguration() {
	const { t } = useLocaleContext()

	return (
		<NewCard label={t(getKey('label'))} description={t(getKey('description'))}>
			<NewCard.Row
				label={t(getKey('publicUrl.label'))}
				description={t(getKey('publicUrl.description'))}
			>
				<ServerPublicURL />
			</NewCard.Row>

			<ServerEmojisSection />
		</NewCard>
	)
}

const LOCALE_BASE = 'settingsScene.server/general.sections.serverConfig'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
