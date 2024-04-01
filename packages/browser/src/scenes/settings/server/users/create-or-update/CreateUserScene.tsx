import { useLocaleContext } from '@stump/i18n'
import React from 'react'
import { Helmet } from 'react-helmet'

import { SceneContainer } from '@/components/container'

import CreateOrUpdateUserForm from './CreateOrUpdateUserForm'

export default function CreateUserScene() {
	const { t } = useLocaleContext()

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | {t('settingsScene.server/users.createUser.helmet')}</title>
			</Helmet>

			<CreateOrUpdateUserForm />
		</SceneContainer>
	)
}
