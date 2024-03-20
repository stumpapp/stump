import { useUserQuery } from '@stump/client'
import { useLocaleContext } from '@stump/i18n'
import React from 'react'
import { Helmet } from 'react-helmet'
import { useParams } from 'react-router'

import { ContentContainer } from '@/components/container'
import { SceneContainer } from '@/components/container'

import CreateOrUpdateUserForm from './CreateOrUpdateUserForm'

export default function UpdateUserScene() {
	const { t } = useLocaleContext()
	const { id } = useParams<{ id: string }>()

	if (!id) {
		throw new Error('ID is required')
	}

	const { user } = useUserQuery({ id })

	return (
		<SceneContainer className="-mt-4">
			<Helmet>
				<title>Stump | {t('settingsScene.server/users.updateUser.helmet')}</title>
			</Helmet>

			<ContentContainer>{user && <CreateOrUpdateUserForm user={user} />}</ContentContainer>
		</SceneContainer>
	)
}
