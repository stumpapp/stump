import { UserPermission } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { Suspense } from 'react'
import { Helmet } from 'react-helmet'

import { ContentContainer } from '@/components/container'
import { SceneContainer } from '@/components/container'
import { useCheckPermission } from '@/context'

import LoginActivitySection from './login-activity/LoginActivitySection'
import UserTableSection from './user-table/UserTableSection'
import UsersStats from './UsersStats'

// TODO: I might want to turn this into a tiny Router with breadcrumbs? Not entirely sure yet,
// the only sub-scene I can think of is user creation which isn't essential to have perfect UX
// out the gate
export default function UsersScene() {
	const { t } = useLocaleContext()

	const canManageUsers = useCheckPermission(UserPermission.ManageUsers)

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | {t('settingsScene.server/users.helmet')}</title>
			</Helmet>

			<ContentContainer>
				{canManageUsers && (
					<Suspense>
						<UsersStats />
					</Suspense>
				)}
				<UserTableSection />
				{canManageUsers && <LoginActivitySection />}
			</ContentContainer>
		</SceneContainer>
	)
}
