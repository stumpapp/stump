import { Alert } from '@stump/components'

import AnalyzeMedia from './AnalyzeMedia'

export default function LibraryAnalysisScene() {
	return (
		<div className="flex flex-col gap-12">
			<Alert level="warning" icon="warning">
				<Alert.Content>This page has limited functionality and is a work in progress</Alert.Content>
			</Alert>

			<AnalyzeMedia />
		</div>
	)
}
