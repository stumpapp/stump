import { Helmet } from 'react-helmet'

import SceneContainer from '@/components/SceneContainer'

import { useLocaleContext } from '../../../../i18n'
import { SettingsContent } from '../../SettingsLayout'
import LocalePreferences from './LocalePreferences'
import ProfileForm from './ProfileForm'

export default function GeneralSettingsScene() {
	const { t } = useLocaleContext()

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | {t('settingsScene.app/general.helmet')}</title>
			</Helmet>

			<SettingsContent>
				<ProfileForm />
				<LocalePreferences />
			</SettingsContent>
		</SceneContainer>
	)
}
