import { Alert, AlertDescription, AlertTitle } from '@stump/components'
import { AlertTriangle } from 'lucide-react'

import { useTranslate } from '@/hooks/useTranslate'

import AnalyzeMedia from './AnalyzeMedia'

const LOCALE_KEY = 'librarySettingsScene.integrations/analysis.workInProgress'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`

export default function LibraryAnalysisScene() {
	const { t } = useTranslate()

	return (
		<div className="gap-12 flex flex-col">
			<Alert variant="warning">
				<AlertTriangle />
				<AlertTitle>{t(getKey('title'))}</AlertTitle>
				<AlertDescription>{t(getKey('description'))}</AlertDescription>
			</Alert>

			<AnalyzeMedia />
		</div>
	)
}
