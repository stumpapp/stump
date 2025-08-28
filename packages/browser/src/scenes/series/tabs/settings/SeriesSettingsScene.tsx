import { useGraphQLMutation, useSDK, useSuspenseGraphQL } from '@stump/client'
import { Alert, Button, Heading } from '@stump/components'
import { graphql } from '@stump/graphql'
import { Construction } from 'lucide-react'
import { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router'

import { SceneContainer } from '@/components/container'
import { SeriesMetadataEditor } from '@/components/series/metadata'
import paths from '@/paths'

import { useSeriesContext } from '../../context'
import SeriesThumbnailSelector from './SeriesThumbnailSelector'

const query = graphql(`
	query SeriesSettingsScene($id: ID!) {
		seriesById(id: $id) {
			id
			...SeriesThumbnailSelector
			metadata {
				...SeriesMetadataEditor
			}
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
		data: { seriesById },
	} = useSuspenseGraphQL(query, sdk.cacheKey('seriesById', [series.id, 'settings']), {
		id: series.id ?? '',
	})

	const { data, mutate: analyze, isPending } = useGraphQLMutation(analyzeMutation)

	const handleAnalyze = useCallback(() => analyze({ id: series.id }), [analyze, series.id])

	useEffect(() => {
		if (!seriesById) {
			navigate(paths.notFound())
		}
	}, [seriesById, navigate])

	if (!seriesById) {
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

				<SeriesThumbnailSelector fragment={seriesById} />

				<div className="flex w-full flex-col gap-y-2">
					<Heading size="sm">Metadata</Heading>
					<SeriesMetadataEditor seriesId={seriesById.id} data={seriesById.metadata} />
				</div>
			</div>
		</SceneContainer>
	)
}
