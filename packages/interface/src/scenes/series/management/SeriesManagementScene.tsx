import { useSeriesByIdQuery } from '@stump/client'
import { Alert, Breadcrumbs, Divider, Heading, Text } from '@stump/components'
import { Construction } from 'lucide-react'
import React, { useMemo } from 'react'
import { Navigate, useParams } from 'react-router'

import SceneContainer from '@/components/SceneContainer'

import paths from '../../../paths'
import SeriesThumbnailSelector from './SeriesThumbnailSelector'

export default function SeriesManagementScene() {
	const { id } = useParams<{ id: string }>()
	if (!id) {
		throw new Error('Series ID is required for this route')
	}

	const { series, isLoading } = useSeriesByIdQuery(id, {
		params: {
			load_library: true,
		},
	})

	const breadcrumbs = useMemo(() => {
		if (!series) return []

		return [
			...(series.library
				? [
						{
							label: series.library.name,
							to: paths.libraryOverview(series.library.id),
						},
				  ]
				: []),
			{
				label: series.metadata?.title || series.name,
				to: paths.seriesOverview(series.id),
			},
			{
				label: 'Manage',
				noShrink: true,
			},
		]
	}, [series])

	if (isLoading) {
		return null
	} else if (!series) {
		return <Navigate to={paths.notFound()} />
	}

	const title = series.metadata?.title || series.name

	return (
		<SceneContainer>
			<div className="flex flex-col items-center text-center md:items-start md:text-left">
				<Heading size="sm">{title}</Heading>

				<Breadcrumbs segments={breadcrumbs} />

				<Text size="sm" variant="muted" className="mt-2">
					Use this page to make various changes to this series as it exists in the database, such as
					changing the thumbnail or updating metadata
				</Text>
			</div>

			<Divider variant="muted" className="my-3.5" />
			<div className="flex flex-col gap-6 pt-2">
				<Alert level="warning" rounded="sm" icon={Construction}>
					<Alert.Content>
						Series management is currently under construction. There are not many features exposed
						here yet.
					</Alert.Content>
				</Alert>

				<SeriesThumbnailSelector series={series} />
			</div>
		</SceneContainer>
	)
}
