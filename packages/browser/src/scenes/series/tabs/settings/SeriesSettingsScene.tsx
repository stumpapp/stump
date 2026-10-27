import { useGraphQLMutation, useSDK, useSuspenseGraphQL } from '@stump/client'
import { Alert, AlertDescription, Button, Heading, Text } from '@stump/components'
import { graphql, MetadataResetImpact, SeriesKind, UserPermission } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { Construction } from 'lucide-react'
import { Suspense, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router'

import { SceneContainer } from '@/components/container'
import { ResetMetadata } from '@/components/metadata/metadataEditor'
import { SeriesMetadataEditor } from '@/components/series/metadata'
import { useAppContext } from '@/context'
import { usePaths } from '@/paths'
import { invalidateThumbnailQueries } from '@/utils/query'

import { useSeriesContext } from '../../context'
import SeriesTagEditor from './SeriesTagEditor'
import SeriesThumbnailSelector from './SeriesThumbnailSelector'

const query = graphql(`
	query SeriesSettingsScene($id: ID!) {
		seriesById(id: $id) {
			id
			...SeriesThumbnailSelector
			tags {
				id
				name
			}
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
	const paths = usePaths()
	const navigate = useNavigate()

	const {
		data: { seriesById },
	} = useSuspenseGraphQL(query, sdk.cacheKey('seriesById', [series.id, 'settings']), {
		id: series.id ?? '',
	})

	const { data, mutate: analyze, isPending } = useGraphQLMutation(analyzeMutation)
	const queryClient = useQueryClient()
	const { mutate: resetMetadata } = useGraphQLMutation(resetMetadataMutation, {
		onSuccess: () => invalidateThumbnailQueries(queryClient),
	})

	const handleAnalyze = useCallback(() => analyze({ id: series.id }), [analyze, series.id])
	const handleResetMetadata = useCallback(
		(impact: MetadataResetImpact) =>
			resetMetadata(
				{ id: series.id, impact },
				{
					onSuccess: () => {
						// resetting the books of a virtual series takes them all out of it, which deletes it
						if (!series.path && impact !== MetadataResetImpact.Series) {
							navigate(paths.librarySeries(series.library.id))
						}
					},
				},
			),
		[resetMetadata, series.id, series.path, series.library.id, navigate, paths],
	)

	useEffect(() => {
		if (!seriesById) {
			navigate(paths.notFound())
		}
	}, [seriesById, navigate, paths])

	if (!seriesById) {
		return null
	}

	return (
		<SceneContainer>
			<div className="gap-y-6 flex flex-col items-start text-left">
				<Alert variant="warning">
					<Construction />
					<AlertDescription>
						Series management is currently under development and has very limited functionality
					</AlertDescription>
				</Alert>

				<div className="gap-y-2 flex flex-col">
					<div>
						<Heading size="sm">Analysis</Heading>
						<Text size="sm" variant="muted">
							Re-analyze this series to update metadata from its files
						</Text>
					</div>

					<div>
						<Button
							title={data ? 'Analysis already in progress' : 'Analyze this series'}
							onClick={handleAnalyze}
							disabled={!!data || isPending}
						>
							Analyze series
						</Button>
					</div>
				</div>

				{checkPermission(UserPermission.EditMetadata) && (
					<Suspense>
						<SeriesTagEditor seriesId={seriesById.id} tags={seriesById.tags} />
					</Suspense>
				)}

				<div className="gap-y-2 flex flex-col">
					<div>
						<Heading size="sm">Thumbnail</Heading>
						<Text size="sm" variant="muted">
							Change the cover image for this series
						</Text>
					</div>

					<SeriesThumbnailSelector fragment={seriesById} />
				</div>

				<div className="gap-y-2 flex w-full flex-col">
					<div className="flex items-end justify-between">
						<div>
							<Heading size="sm">Metadata</Heading>
							<Text variant="muted">Extra information about your series</Text>
						</div>
						{checkPermission(UserPermission.EditMetadata) && (
							<ResetMetadata
								isVirtual={series.kind === SeriesKind.Virtual}
								onConfirmReset={handleResetMetadata}
							/>
						)}
					</div>
					<SeriesMetadataEditor seriesId={seriesById.id} data={seriesById.metadata} />
				</div>
			</div>
		</SceneContainer>
	)
}
