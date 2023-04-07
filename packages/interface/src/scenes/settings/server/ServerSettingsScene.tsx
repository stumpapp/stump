import { Heading, Text } from '@stump/components'
import { Helmet } from 'react-helmet'

import SceneContainer from '../../../components/SceneContainer'
import { useLocaleContext } from '../../../i18n'

export default function ServerSettingsScene() {
	const { t } = useLocaleContext()

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | {t('settingsScene.server.helmet')}</title>
			</Helmet>

			<Heading>{t('settingsScene.server.heading')}</Heading>
			<Text size="sm" variant="muted" className="mt-1">
				{t('settingsScene.server.subtitle')}
			</Text>
		</SceneContainer>
	)
}
