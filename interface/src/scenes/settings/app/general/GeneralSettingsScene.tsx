import { Helmet } from 'react-helmet'

import { ContentContainer } from '@/components/container'
import { SceneContainer } from '@/components/container'

import { useLocaleContext } from '../../../../i18n'
import LocalePreferences from './LocalePreferences'
import ProfileForm from './ProfileForm'

export default function GeneralSettingsScene() {
	const { t } = useLocaleContext()

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | {t('settingsScene.app/general.helmet')}</title>
			</Helmet>

			<ContentContainer>
				<ProfileForm />
				<LocalePreferences />
			</ContentContainer>
		</SceneContainer>
	)
}
