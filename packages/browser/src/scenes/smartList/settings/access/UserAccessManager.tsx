import { Alert, AlertDescription } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { AlertTriangle } from 'lucide-react'

// TODO: lock down access to CoCreator?
export default function UserAccessManager() {
	const { t } = useLocaleContext()

	return (
		<div>
			<Alert variant="info">
				<AlertTriangle />
				<AlertDescription>{t(getKey('disclaimer'))}</AlertDescription>
			</Alert>
		</div>
	)
}

const LOCALE_KEY = 'smartListSettingsScene.access.sections.accessManager'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
