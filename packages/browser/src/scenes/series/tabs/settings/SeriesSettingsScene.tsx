import { useGraphQLMutation, useSDK, useSuspenseGraphQL } from '@stump/client'
import { graphql, MetadataResetImpact, SeriesKind, UserPermission } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { Suspense, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router'

import { SceneContainer } from '@/components/container'
import { ResetMetadata } from '@/components/metadata/metadataEditor'
import { useSeriesContext } from '@/components/series/context'
import { SeriesMetadataEditor } from '@/components/series/metadata'
import SeriesTagEditor from '@/components/series/SeriesTagEditor'
import { SettingsSection } from '@/components/sharedLayout'
import { useAppContext } from '@/context'
import { usePaths } from '@/paths'
import { invalidateThumbnailQueries } from '@/utils/query'

const query = graphql(`
	query SeriesSettingsScene($id: ID!) {
		seriesById(id: $id) {
			id
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

	const queryClient = useQueryClient()
	const { mutate: resetMetadata } = useGraphQLMutation(resetMetadataMutation, {
		onSuccess: () => invalidateThumbnailQueries(queryClient),
	})

	const handleResetMetadata = useCallback(
		(impact: MetadataResetImpact) =>
			resetMetadata(
				{ id: series.id, impact },
				{
					onSuccess: () => {
						// resetting the books of a virtual series takes them all out of it, which deletes it
						if (series.kind === SeriesKind.Virtual && impact !== MetadataResetImpact.Series) {
							navigate(paths.librarySeries(series.library.id))
						}
					},
				},
			),
		[resetMetadata, series.id, series.kind, series.library.id, navigate, paths],
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
		<SceneContainer variant="settings" className="max-w-[unset]">
			{checkPermission(UserPermission.EditMetadata) && (
				<Suspense>
					<SeriesTagEditor seriesId={seriesById.id} tags={seriesById.tags} />
				</Suspense>
			)}

			<SettingsSection
				title="Metadata"
				description="Extra information about your series"
				actions={
					checkPermission(UserPermission.EditMetadata) && (
						<ResetMetadata
							isVirtual={series.kind === SeriesKind.Virtual}
							onConfirmReset={handleResetMetadata}
						/>
					)
				}
			>
				<SeriesMetadataEditor seriesId={seriesById.id} data={seriesById.metadata} />
			</SettingsSection>
		</SceneContainer>
	)
}
