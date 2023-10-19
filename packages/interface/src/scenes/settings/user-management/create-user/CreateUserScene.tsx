import { Breadcrumbs } from '@stump/components'
import React from 'react'
import { Helmet } from 'react-helmet'

import SceneContainer from '../../../../components/SceneContainer'
import { useLocaleContext } from '../../../../i18n'
import paths from '../../../../paths'
import CreateUserForm from './CreateUserForm'

export default function CreateUserScene() {
	const { t } = useLocaleContext()

	return (
		<SceneContainer className="-mt-4">
			<Helmet>
				<title>Stump | {t('settingsScene.createUsers.helmet')}</title>
			</Helmet>

			<Breadcrumbs
				segments={[
					{
						label: t('settingsScene.users.heading'),
						to: paths.settings('users'),
					},
					{
						label: t('settingsScene.createUsers.heading'),
						noShrink: true,
					},
				]}
			/>
			<div className="h-4" />
			<CreateUserForm />
		</SceneContainer>
	)
}
