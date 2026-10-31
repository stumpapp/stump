import { useGraphQLMutation, useSDK, useSuspenseGraphQL } from '@stump/client'
import { graphql, MetadataResetImpact, UserPermission } from '@stump/graphql'
import { Suspense, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router'

import { SceneContainer } from '@/components/container'
import { ResetMetadata } from '@/components/metadata/metadataEditor'
import { useSeriesContext } from '@/components/series/context'
import { SeriesMetadataEditor } from '@/components/series/metadata'
import SeriesTagEditor from '@/components/series/SeriesTagEditor'
import { SettingsSection } from '@/components/sharedLayout'
import { useAppContext } from '@/context'
import { useTranslate } from '@/hooks/useTranslate'
import { usePaths } from '@/paths'

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
	const { t } = useTranslate()
	const paths = usePaths()
	const navigate = useNavigate()

	const {
		data: { seriesById },
	} = useSuspenseGraphQL(query, sdk.cacheKey('seriesById', [series.id, 'settings']), {
		id: series.id ?? '',
	})

	const { mutate: resetMetadata } = useGraphQLMutation(resetMetadataMutation)

	const handleResetMetadata = useCallback(
		(impact: MetadataResetImpact) => resetMetadata({ id: series.id, impact }),
		[resetMetadata, series.id],
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
				title={t('seriesSettingsScene.metadata')}
				description={t('seriesSettingsScene.metadataDescription')}
				actions={
					checkPermission(UserPermission.EditMetadata) && (
						<ResetMetadata onConfirmReset={handleResetMetadata} />
					)
				}
			>
				<SeriesMetadataEditor seriesId={seriesById.id} data={seriesById.metadata} />
			</SettingsSection>
		</SceneContainer>
	)
}
