import { Divider, Heading, Text } from '@stump/components'
import { Helmet } from 'react-helmet'

import SceneContainer from '../../../components/SceneContainer'
import { useLocaleContext } from '../../../i18n'
import LocaleSelector from './LocaleSelector'
import ProfileForm from './ProfileForm'

export default function GeneralSettingsScene() {
	const { t } = useLocaleContext()

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | {t('settingsScene.general.helmet')}</title>
			</Helmet>

			<Heading>{t('settingsScene.general.heading')}</Heading>
			<Text size="sm" variant="muted" className="mt-1.5">
				{t('settingsScene.general.subtitle')}
			</Text>

			<Divider variant="muted" className="my-3.5" />

			<div className="mt-6 flex flex-col gap-12">
				<ProfileForm />
				<LocaleSelector />
			</div>
		</SceneContainer>
	)
}
