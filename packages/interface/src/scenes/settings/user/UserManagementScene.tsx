import { useUsersQuery } from '@stump/client'
import { Helmet } from 'react-helmet'
import { Navigate } from 'react-router'

import SceneContainer from '../../../components/SceneContainer'
import { useAppContext } from '../../../context'
import { useLocaleContext } from '../../../i18n/index'
import { SettingsContent, SettingsHeading } from '../SettingsLayout'
import { UserManagementContext } from './context'
import UserTableSection from './user-table/UserTableSection'
import UserManagementStats from './UserManagementStats'

// TODO: I might want to turn this into a tiny Router with breadcrumbs? Not enirely sure yet,
// the only sub-scene I can think of is user creation which isn't essential to have perfect UX
// out the gate
export default function UserManagementScene() {
	const { t } = useLocaleContext()
	const { isServerOwner } = useAppContext()
	const { users, isRefetching: isRefetchingUsers } = useUsersQuery({
		enabled: isServerOwner,
		params: {
			include_read_progresses: true,
		},
	})

	if (!isServerOwner) {
		return <Navigate to="/404" />
	}

	return (
		<UserManagementContext.Provider value={{ isRefetchingUsers, users: users || [] }}>
			<SceneContainer>
				<Helmet>
					<title>Stump | {t('settingsScene.users.helmet')}</title>
				</Helmet>

				<SettingsHeading
					heading={t('settingsScene.users.heading')}
					subtitle={t('settingsScene.users.subtitle')}
				/>

				<SettingsContent>
					<UserManagementStats />
					<UserTableSection />
				</SettingsContent>
			</SceneContainer>
		</UserManagementContext.Provider>
	)
}
