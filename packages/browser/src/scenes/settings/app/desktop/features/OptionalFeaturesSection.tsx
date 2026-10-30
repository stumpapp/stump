import { Alert, AlertDescription, AlertTitle, NewCard } from '@stump/components'
import { Info } from 'lucide-react'
import { usePreviousDifferent } from 'rooks'

import { useTranslate } from '@/hooks/useTranslate'
import { useTauriStore } from '@/stores'

import BundledServer from './BundledServer'
import DiscordPresenceSwitch from './DiscordPresenceSwitch'

export default function OptionalFeaturesSection() {
	const { t } = useTranslate()

	const { runBundledServer } = useTauriStore()

	// this is far from perfect because navigating away resets the state lol but
	// it's fine for now. maybe TODO add a btn to restart app
	const didChangeRestartSettings = usePreviousDifferent(runBundledServer)

	return (
		<div className="gap-4 flex flex-col">
			<NewCard label={t(getKey('label'))}>
				<BundledServer />
				<DiscordPresenceSwitch />
			</NewCard>

			{didChangeRestartSettings && (
				<Alert variant="info">
					<Info />
					<AlertTitle>{t(getKey('restartRequired.title'))}</AlertTitle>
					<AlertDescription>{t(getKey('restartRequired.description'))}</AlertDescription>
				</Alert>
			)}
		</div>
	)
}

const LOCALE_KEY = 'settingsScene.app/desktop.sections.optionalFeatures'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
