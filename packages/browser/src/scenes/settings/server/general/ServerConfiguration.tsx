import { NewCard } from '@stump/components'

import { useTranslate } from '@/hooks/useTranslate'

import ServerEmojisSection from './ServerEmojisSection'
import ServerPublicURL from './ServerPublicURL'

export function ServerConfiguration() {
	const { t } = useTranslate()

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
