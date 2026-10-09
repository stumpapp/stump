import { Alert, AlertDescription, AlertTitle } from '@stump/components'
import { AlertCircle } from 'lucide-react'

import { useTranslate } from '@/hooks/useTranslate'

export function ExperimentalFeatureDisclaimer() {
	const { translate } = useTranslate()

	// sorry folks, this one isn't dismissable
	return (
		<Alert variant="warning">
			<AlertCircle />
			<AlertTitle>{translate('shared.common.experimentalDisclaimer.title')}</AlertTitle>
			<AlertDescription>
				{translate('shared.common.experimentalDisclaimer.description')}
			</AlertDescription>
		</Alert>
	)
}
