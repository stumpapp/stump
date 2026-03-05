import { Alert, AlertDescription, AlertTitle } from '@stump/components'
import { AlertTriangle } from 'lucide-react'

import AnalyzeMedia from './AnalyzeMedia'

export default function LibraryAnalysisScene() {
	return (
		<div className="flex flex-col gap-12">
			<Alert variant="warning">
				<AlertTriangle />
				<AlertTitle>Work in progress</AlertTitle>
				<AlertDescription>
					This page has limited functionality and is a work in progress
				</AlertDescription>
			</Alert>

			<AnalyzeMedia />
		</div>
	)
}
