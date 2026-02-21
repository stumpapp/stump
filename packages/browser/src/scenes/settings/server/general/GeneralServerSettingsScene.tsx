import { useCheckForServerUpdate, useUploadConfig } from '@stump/client'
import { Alert, AlertDescription } from '@stump/components'
import { UserPermission } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { AlertTriangle } from 'lucide-react'
import { Suspense } from 'react'
import { Helmet } from 'react-helmet'

import { ContentContainer } from '@/components/container'
import { SceneContainer } from '@/components/container'
import { useAppContext } from '@/context'

import HelpfulLinks from './HelpfulLinks'
import ServerEmojisSection from './ServerEmojisSection'
import ServerInfoSection from './ServerInfoSection'
import ServerPublicURL from './ServerPublicURL'
import ServerStats from './ServerStats'

export default function GeneralServerSettingsScene() {
	const { t } = useLocaleContext()
	const { checkPermission } = useAppContext()

	const { updateAvailable } = useCheckForServerUpdate()
	const { uploadConfig } = useUploadConfig({ enabled: checkPermission(UserPermission.UploadFile) })

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | {t('settingsScene.server/general.helmet')}</title>
			</Helmet>

			<ContentContainer>
				<div className="flex flex-col gap-12">
					<Suspense>
						<ServerStats />
					</Suspense>

					{updateAvailable && (
						<Alert variant="warning">
							<AlertTriangle />
							<AlertDescription>
								{t('settingsScene.server/general.sections.updateAvailable.message')}
							</AlertDescription>
						</Alert>
					)}

					<ServerInfoSection />
					<ServerPublicURL />
					{uploadConfig?.enabled && <ServerEmojisSection />}

					<HelpfulLinks />
				</div>
			</ContentContainer>
		</SceneContainer>
	)
}
