import { useGraphQLMutation, useSDK, useSuspenseGraphQL } from '@stump/client'
import { Alert, AlertDescription, Button, Heading, Text } from '@stump/components'
import { graphql, MetadataResetImpact, UserPermission } from '@stump/graphql'
import { Construction } from 'lucide-react'
import { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router'

import { SceneContainer } from '@/components/container'
import { ResetMetadata } from '@/components/metadataEditor'
import { SeriesMetadataEditor } from '@/components/series/metadata'
import { useAppContext } from '@/context'
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

const resetMetadataMutation = graphql(`
	mutation SeriesSettingsSceneResetMetadata($id: ID!, $impact: MetadataResetImpact!) {
		resetSeriesMetadata(id: $id, impact: $impact) {
			id
		}
	}
`)

export default function SeriesSettingsScene() {
	const { sdk } = useSDK()
	const { series } = useSeriesContext()
	const { checkPermission } = useAppContext()

	const navigate = useNavigate()

	const {
		data: { seriesById },
	} = useSuspenseGraphQL(query, sdk.cacheKey('seriesById', [series.id, 'settings']), {
		id: series.id ?? '',
	})

	const { data, mutate: analyze, isPending } = useGraphQLMutation(analyzeMutation)
	const { mutate: resetMetadata } = useGraphQLMutation(resetMetadataMutation)

	const handleAnalyze = useCallback(() => analyze({ id: series.id }), [analyze, series.id])
	const handleResetMetadata = useCallback(
		(impact: MetadataResetImpact) => resetMetadata({ id: series.id, impact }),
		[resetMetadata, series.id],
	)

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
				<Alert variant="warning">
					<Construction />
					<AlertDescription>
						Series management is currently under development and has very limited functionality
					</AlertDescription>
				</Alert>

				<Button
					title={data ? 'Analysis already in progress' : 'Analyze this series'}
					size="md"
					variant="primary"
					onClick={handleAnalyze}
					disabled={!!data || isPending}
				>
					Analyze series
				</Button>

				<SeriesThumbnailSelector fragment={seriesById} />

				<div className="flex w-full flex-col gap-y-2">
					<div className="flex items-end justify-between">
						<div>
							<Heading size="sm">Metadata</Heading>
							<Text variant="muted">Extra information about your series</Text>
						</div>
						{checkPermission(UserPermission.EditMetadata) && (
							<ResetMetadata onConfirmReset={handleResetMetadata} />
						)}
					</div>
					<SeriesMetadataEditor seriesId={seriesById.id} data={seriesById.metadata} />
				</div>
			</div>
		</SceneContainer>
	)
}
