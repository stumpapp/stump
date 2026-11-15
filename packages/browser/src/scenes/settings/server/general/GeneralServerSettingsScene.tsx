import { useCheckForServerUpdate } from '@stump/client'
import { Alert, AlertDescription } from '@stump/components'
import { AlertTriangle } from 'lucide-react'
import { Suspense } from 'react'

import { SceneContainer } from '@/components/container'
import { useTranslate } from '@/hooks/useTranslate'
import { AppTitle } from '@/AppTitle'

import HelpfulLinks from './HelpfulLinks'
import { ServerConfiguration } from './ServerConfiguration'
import ServerInfoSection from './ServerInfoSection'
import ServerStats from './ServerStats'

export default function GeneralServerSettingsScene() {
	const { t, translate } = useTranslate()

	// TODO: make this a toast?
	const { updateAvailable } = useCheckForServerUpdate()

	return (
		<SceneContainer variant="settings">
			<AppTitle title={t('settingsScene.server/general.helmet')} />

			<div className="gap-12 flex flex-col">
				<Suspense>
					<ServerStats />
				</Suspense>

				{updateAvailable && (
					<Alert variant="warning">
						<AlertTriangle />
						<AlertDescription>
							{translate('shared.serverSettings.updateAvailable.message')}
						</AlertDescription>
					</Alert>
				)}

				<ServerConfiguration />

				<ServerInfoSection />

				<HelpfulLinks />
			</div>
		</SceneContainer>
	)
}
