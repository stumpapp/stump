import { Helmet } from 'react-helmet'

import SceneContainer from '@/components/SceneContainer'

import { useLocaleContext } from '../../../i18n'
import { SettingsContent, SettingsHeading } from '../SettingsLayout'
import LoginActivitySection from './login-activity/LoginActivitySection'
import UserTableSection from './user-table/UserTableSection'
import UserManagementStats from './UserManagementStats'

// TODO: I might want to turn this into a tiny Router with breadcrumbs? Not enirely sure yet,
// the only sub-scene I can think of is user creation which isn't essential to have perfect UX
// out the gate
export default function UserManagementScene() {
	const { t } = useLocaleContext()

	return (
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
	)
}
