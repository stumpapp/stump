import React from 'react'
import { Helmet } from 'react-helmet'

import SceneContainer from '@/components/SceneContainer'
import { useLocaleContext } from '@/i18n'

import { SettingsContent } from '../../../SettingsLayout'
import CreateOrUpdateUserForm from './CreateOrUpdateUserForm'

export default function CreateUserScene() {
	const { t } = useLocaleContext()

	return (
		<SceneContainer className="-mt-4">
			<Helmet>
				<title>Stump | {t('settingsScene.server/users.createUser.helmet')}</title>
			</Helmet>

			<SettingsContent>
				<CreateOrUpdateUserForm />
			</SettingsContent>
		</SceneContainer>
	)
}
