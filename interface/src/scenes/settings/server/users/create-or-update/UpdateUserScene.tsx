import { useUserQuery } from '@stump/client'
import React from 'react'
import { Helmet } from 'react-helmet'
import { useParams } from 'react-router'

import SceneContainer from '@/components/SceneContainer'
import { useLocaleContext } from '@/i18n'

import { SettingsContent } from '../../../SettingsLayout'
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

			<SettingsContent>{user && <CreateOrUpdateUserForm user={user} />}</SettingsContent>
		</SceneContainer>
	)
}
