import { UserPermission } from '@stump/graphql'
import { Suspense } from 'react'

import { AppTitle } from '@/AppTitle'
import { SceneContainer } from '@/components/container'
import { useCheckPermission } from '@/context'
import { useTranslate } from '@/hooks/useTranslate'

import LoginActivitySection from './login-activity/LoginActivitySection'
import UserTableSection from './user-table/UserTableSection'
import UsersStats from './UsersStats'

export default function UsersScene() {
	const { t } = useTranslate()

	const canManageUsers = useCheckPermission(UserPermission.ManageUsers)

	return (
		<SceneContainer variant="settings">
			<AppTitle title={t('settingsScene.server/users.helmet')} />

			{canManageUsers && (
				<Suspense>
					<UsersStats />
				</Suspense>
			)}
			<UserTableSection />
			{canManageUsers && <LoginActivitySection />}
		</SceneContainer>
	)
}
