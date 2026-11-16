import { AppTitle } from '@/AppTitle'
import { SceneContainer } from '@/components/container'
import { useTranslate } from '@/hooks/useTranslate'

import LocalePreferences from './LocalePreferences'
import ProfileForm from './ProfileForm'

export default function GeneralSettingsScene() {
	const { t } = useTranslate()

	return (
		<SceneContainer variant="settings">
			<AppTitle title={t('settingsScene.app/account.helmet')} />	

			<ProfileForm />
			<LocalePreferences />
		</SceneContainer>
	)
}
