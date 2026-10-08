import { useLocaleContext } from '@stump/i18n'
import { Helmet } from 'react-helmet'

import { ContentContainer } from '@/components/container'
import { SceneContainer } from '@/components/container'
import { useTranslate } from '@/hooks/useTranslate'

import LocalePreferences from './LocalePreferences'
import ProfileForm from './ProfileForm'

export default function GeneralSettingsScene() {
	const { t } = useTranslate()

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | {t('settingsScene.app/account.helmet')}</title>
			</Helmet>

			<ContentContainer>
				<ProfileForm />
				<LocalePreferences />
			</ContentContainer>
		</SceneContainer>
	)
}
