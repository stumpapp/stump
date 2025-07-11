import { useLocaleContext } from '@stump/i18n'
import { Helmet } from 'react-helmet'

import { ContentContainer } from '@/components/container'
import { SceneContainer } from '@/components/container'

import LoginActivitySection from './login-activity/LoginActivitySection'
import UserTableSection from './user-table/UserTableSection'
import UserManagementStats from './UsersStats'

// TODO: I might want to turn this into a tiny Router with breadcrumbs? Not entirely sure yet,
// the only sub-scene I can think of is user creation which isn't essential to have perfect UX
// out the gate
export default function UsersScene() {
	const { t } = useLocaleContext()

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | {t('settingsScene.server/users.helmet')}</title>
			</Helmet>

			<ContentContainer>
				{/* <UserManagementStats /> */}
				<UserTableSection />
				{/* <LoginActivitySection /> */}
			</ContentContainer>
		</SceneContainer>
	)
}
