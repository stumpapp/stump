import { useUsersQuery } from '@stump/client'
import { User } from '@stump/types'
import { PaginationState } from '@tanstack/react-table'
import { useState } from 'react'
import { Helmet } from 'react-helmet'
import { Navigate } from 'react-router'

import SceneContainer from '../../../components/SceneContainer'
import { useAppContext } from '../../../context'
import { useLocaleContext } from '../../../i18n/index'
import { SettingsContent, SettingsHeading } from '../SettingsLayout'
import { UserManagementContext } from './context'
import LoginActivitySection from './login-activity/LoginActivitySection'
import UserTableSection from './user-table/UserTableSection'
import UserManagementStats from './UserManagementStats'

// TODO: I might want to turn this into a tiny Router with breadcrumbs? Not enirely sure yet,
// the only sub-scene I can think of is user creation which isn't essential to have perfect UX
// out the gate
export default function UserManagementScene() {
	const [deletingUser, setDeletingUser] = useState<User | null>(null)
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	})

	const { t } = useLocaleContext()
	const { isServerOwner } = useAppContext()
	const {
		users,
		pageData,
		isRefetching: isRefetchingUsers,
	} = useUsersQuery({
		enabled: isServerOwner,
		page: pagination.pageIndex,
		page_size: pagination.pageSize,
		params: {
			include_read_progresses: true,
			include_session_count: true,
		},
	})

	if (!isServerOwner) {
		return <Navigate to="/404" />
	}

	return (
		<UserManagementContext.Provider
			value={{
				deletingUser,
				isRefetchingUsers,
				pageCount: pageData?.total_pages || -1,
				pagination,
				setDeletingUser,
				setPagination,
				users: users || [],
			}}
		>
			<SceneContainer>
				<Helmet>
					<title>Stump | {t('settingsScene.users.helmet')}</title>
				</Helmet>

				<UserManagementStats />

				<SettingsHeading
					heading={t('settingsScene.users.heading')}
					subtitle={t('settingsScene.users.subtitle')}
				/>

				<SettingsContent>
					<UserTableSection />
					<LoginActivitySection />
				</SettingsContent>
			</SceneContainer>
		</UserManagementContext.Provider>
	)
}
