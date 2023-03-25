import { Heading, Text } from '@stump/components'
import { Helmet } from 'react-helmet'
import { Navigate } from 'react-router'

import SceneContainer from '../../../components/SceneContainer'
import { useAppContext } from '../../../context'
import { useLocaleContext } from '../../../i18n/index'

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

			<Heading>{t('settingsScene.users.heading')}</Heading>
			<Text size="sm" variant="muted" className="mt-1">
				{t('settingsScene.users.subtitle')}
			</Text>
		</SceneContainer>
	)
}
