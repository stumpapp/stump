import { Helmet } from 'react-helmet'

import SceneContainer from '@/components/SceneContainer'

import { useLocaleContext } from '../../../i18n'
import { SettingsContent, SettingsHeading } from '../SettingsLayout'
import LocalePreferences from './LocalePreferences'
import ProfileForm from './ProfileForm'
import SystemThemeForm from './SystemThemeForm'
import UiPreferences from './UiPreferences'

export default function GeneralSettingsScene() {
	const { t } = useLocaleContext()

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | {t('settingsScene.general.helmet')}</title>
			</Helmet>

			<SettingsHeading
				heading={t('settingsScene.general.heading')}
				subtitle={t('settingsScene.general.subtitle')}
			/>

			<SettingsContent>
				<ProfileForm />
				<SystemThemeForm />
				<LocalePreferences />
				<UiPreferences />
			</SettingsContent>
		</SceneContainer>
	)
}
