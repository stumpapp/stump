import { useSDK } from '@stump/client'
import { Alert, Button } from '@stump/components'
import { Construction } from 'lucide-react'

import { SceneContainer } from '@/components/container'

import { useSeriesContext } from '../../context'
import SeriesThumbnailSelector from './SeriesThumbnailSelector'

export default function SeriesSettingsScene() {
	const { sdk } = useSDK()
	const { series } = useSeriesContext()

	function handleAnalyze() {
		sdk.series.analyze(series.id)
	}

	return (
		<SceneContainer>
			<div className="flex flex-col items-start gap-y-6 text-left">
				<Alert level="warning" rounded="sm" icon={Construction}>
					<Alert.Content>
						Series management is currently under development and has very limited functionality
					</Alert.Content>
				</Alert>

				<Button size="md" variant="primary" onClick={handleAnalyze}>
					Analyze Media
				</Button>

				{/* <SeriesThumbnailSelector series={series} /> */}
			</div>
		</SceneContainer>
	)
}
