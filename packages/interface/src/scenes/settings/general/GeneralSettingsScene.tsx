import { Heading, Text } from '@stump/components'
import { Helmet } from 'react-helmet'

import SceneContainer from '../../../components/SceneContainer'
import { useLocaleContext } from '../../../i18n'
import LocaleSelector from './LocaleSelector'

export default function GeneralSettingsScene() {
	const { t } = useLocaleContext()

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | {t('settingsScene.general.helmet')}</title>
			</Helmet>

			<Heading>{t('settingsScene.general.heading')}</Heading>
			<Text size="sm" variant="muted" className="mt-1">
				{t('settingsScene.general.subtitle')}
			</Text>

			<div className="mt-4">
				<LocaleSelector />
			</div>
		</SceneContainer>
	)
}
