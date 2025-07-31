import { useGraphQLMutation, useSDK, useSuspenseGraphQL } from '@stump/client'
import { Alert, Button } from '@stump/components'
import { graphql } from '@stump/graphql'
import { Construction } from 'lucide-react'
import { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router'

import { SceneContainer } from '@/components/container'
import paths from '@/paths'

import { useSeriesContext } from '../../context'
import SeriesThumbnailSelector from './SeriesThumbnailSelector'

const query = graphql(`
	query SeriesSettingsScene($id: ID!) {
		seriesById(id: $id) {
			...SeriesThumbnailSelector
		}
	}
`)

const analyzeMutation = graphql(`
	mutation SeriesSettingsSceneAnalyze($id: ID!) {
		analyzeSeries(id: $id)
	}
`)

export default function SeriesSettingsScene() {
	const { sdk } = useSDK()
	const { series } = useSeriesContext()

	const navigate = useNavigate()

	const {
		data: { seriesById: fragment },
	} = useSuspenseGraphQL(query, sdk.cacheKey('seriesById', [series.id, 'settings']), {
		id: series.id ?? '',
	})

	const { data, mutate: analyze, isPending } = useGraphQLMutation(analyzeMutation)

	const handleAnalyze = useCallback(() => analyze({ id: series.id }), [analyze, series.id])

	useEffect(() => {
		if (!fragment) {
			navigate(paths.notFound())
		}
	}, [fragment, navigate])

	if (!fragment) {
		return null
	}

	return (
		<SceneContainer>
			<div className="flex flex-col items-start gap-y-6 text-left">
				<Alert level="warning" rounded="sm" icon={Construction}>
					<Alert.Content>
						Series management is currently under development and has very limited functionality
					</Alert.Content>
				</Alert>

				<Button
					title={data ? 'Analysis already in progress' : 'Analyze this series'}
					size="md"
					variant="primary"
					onClick={handleAnalyze}
					disabled={!!data || isPending}
				>
					Analyze Series
				</Button>

				<SeriesThumbnailSelector fragment={fragment} />
			</div>
		</SceneContainer>
	)
}
