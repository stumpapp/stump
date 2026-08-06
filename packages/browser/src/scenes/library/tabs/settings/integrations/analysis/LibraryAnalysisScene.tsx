import { Alert, AlertDescription, AlertTitle } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { AlertTriangle } from 'lucide-react'

import AnalyzeMedia from './AnalyzeMedia'

export default function LibraryAnalysisScene() {
	const { t } = useLocaleContext()
	return (
		<div className="gap-12 flex flex-col">
			<Alert variant="warning">
				<AlertTriangle />
				<AlertTitle>{t('libraryUi.workInProgress')}</AlertTitle>
				<AlertDescription>{t('libraryUi.workInProgressDescription')}</AlertDescription>
			</Alert>

			<AnalyzeMedia />
		</div>
	)
}
