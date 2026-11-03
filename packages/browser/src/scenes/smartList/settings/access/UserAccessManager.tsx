import { Alert, AlertDescription } from '@stump/components'
import { AlertTriangle } from 'lucide-react'

import { useTranslate } from '@/hooks/useTranslate'

// TODO: lock down access to CoCreator?
export default function UserAccessManager() {
	const { t } = useTranslate()

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
