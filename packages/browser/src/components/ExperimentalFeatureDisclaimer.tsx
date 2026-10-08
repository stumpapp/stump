import { Alert, AlertDescription, AlertTitle } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { AlertCircle } from 'lucide-react'

import { useTranslate } from '@/hooks/useTranslate'

export function ExperimentalFeatureDisclaimer() {
	const { t } = useTranslate()

	// sorry folks, this one isn't dismissable
	return (
		<Alert variant="warning">
			<AlertCircle />
			<AlertTitle>{t('common.experimentalDisclaimer.title')}</AlertTitle>
			<AlertDescription>{t('common.experimentalDisclaimer.description')}</AlertDescription>
		</Alert>
	)
}
