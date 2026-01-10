import { useLocaleContext } from '@stump/i18n'
import { Suspense } from 'react'
import { Helmet } from 'react-helmet'

import { ContentContainer } from '@/components/container'
import { SceneContainer } from '@/components/container'

import LoginActivitySection from './login-activity/LoginActivitySection'
import UserTableSection from './user-table/UserTableSection'
import UsersStats from './UsersStats'

// TODO: Super weird scrolling issues here???

// TODO: I might want to turn this into a tiny Router with breadcrumbs? Not entirely sure yet,
// the only sub-scene I can think of is user creation which isn't essential to have perfect UX
// out the gate

// TODO(sea-orm): Re-add stats
export default function UsersScene() {
	const { t } = useLocaleContext()

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | {t('settingsScene.server/users.helmet')}</title>
			</Helmet>

			<ContentContainer>
				<Suspense>
					<UsersStats />
				</Suspense>
				<UserTableSection />
				<LoginActivitySection />
			</ContentContainer>
		</SceneContainer>
	)
}
