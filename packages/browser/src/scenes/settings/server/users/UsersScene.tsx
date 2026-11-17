import { Suspense } from 'react'

import { AppTitle } from '@/AppTitle'
import { SceneContainer } from '@/components/container'
import { useAppContext } from '@/context'
import { useTranslate } from '@/hooks/useTranslate'

import LoginActivitySection from './login-activity/LoginActivitySection'
import UserTableSection from './user-table/UserTableSection'
import UsersStats from './UsersStats'

export default function UsersScene() {
	const { t } = useTranslate()
	// TODO(permissions): isServerOwner will be replaced by discrete permissions
	// once https://github.com/stumpapp/stump/tree/improve-permissioning is merged
	// ^ so once it is, use those (prolly stats-specific ones?) instead
	const { isServerOwner } = useAppContext()

	return (
		<SceneContainer variant="settings">
			<AppTitle title={t('settingsScene.server/users.helmet')} />

			{isServerOwner && (
				<Suspense>
					<UsersStats />
				</Suspense>
			)}
			<UserTableSection />
			{isServerOwner && <LoginActivitySection />}
		</SceneContainer>
	)
}
