import React from 'react'
import { Helmet } from 'react-helmet'

import { ContentContainer } from '@/components/container'
import SceneContainer from '@/components/SceneContainer'
import { useLocaleContext } from '@/i18n'

import CreateOrUpdateUserForm from './CreateOrUpdateUserForm'

export default function CreateUserScene() {
	const { t } = useLocaleContext()

	return (
		<SceneContainer className="-mt-4">
			<Helmet>
				<title>Stump | {t('settingsScene.server/users.createUser.helmet')}</title>
			</Helmet>

			<ContentContainer>
				<CreateOrUpdateUserForm />
			</ContentContainer>
		</SceneContainer>
	)
}
