import { mediaApi } from '@stump/api'
import { Alert, Button } from '@stump/components'
import { Construction } from 'lucide-react'
import { toast } from 'react-hot-toast'

import { SceneContainer } from '@/components/container'

import { useSeriesContext } from '../context'
import SeriesThumbnailSelector from './SeriesThumbnailSelector'

export default function SeriesSettingsScene() {
	const { series } = useSeriesContext()

	function handleAnalyze() {
		mediaApi.startMediaAnalysisForSeries(series.id)

		// TODO Remove testing visualizations
		toast.success('Starting analysis')
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

				<SeriesThumbnailSelector series={series} />
			</div>
		</SceneContainer>
	)
}
