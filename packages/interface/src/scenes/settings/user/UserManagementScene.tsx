import { Divider, Heading, Text } from '@stump/components'
import { Helmet } from 'react-helmet'
import { Navigate } from 'react-router'

import SceneContainer from '../../../components/SceneContainer'
import { useAppContext } from '../../../context'
import { useLocaleContext } from '../../../i18n/index'
import { SettingsContent, SettingsHeading } from '../SettingsLayout'
import UserManagementStats from './UserManagementStats'
import UserTable from './UserTable'

export default function UserManagementScene() {
	const { t } = useLocaleContext()
	const { isServerOwner } = useAppContext()

	if (!isServerOwner) {
		return <Navigate to="/404" />
	}

	return (
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
				<UserTable />
			</SettingsContent>
		</SceneContainer>
	)
}
