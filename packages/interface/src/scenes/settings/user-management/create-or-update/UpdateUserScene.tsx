import { useUserQuery } from '@stump/client'
import { Breadcrumbs } from '@stump/components'
import React from 'react'
import { Helmet } from 'react-helmet'
import { useParams } from 'react-router'

import SceneContainer from '../../../../components/SceneContainer'
import { useLocaleContext } from '../../../../i18n'
import paths from '../../../../paths'
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
				<title>Stump | {t('settingsScene.createOrUpdateUsers.updateHelmet')}</title>
			</Helmet>

			<Breadcrumbs
				segments={[
					{
						label: t('settingsScene.users.heading'),
						to: paths.settings('users'),
					},
					{
						label: t('settingsScene.createOrUpdateUsers.updateHeading'),
						noShrink: true,
					},
				]}
			/>
			<div className="h-4" />

			{user && <CreateOrUpdateUserForm user={user} />}
		</SceneContainer>
	)
}
