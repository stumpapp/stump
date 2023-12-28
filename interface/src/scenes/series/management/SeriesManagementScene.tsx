import { useSeriesByIdQuery } from '@stump/client'
import { Alert, Breadcrumbs, Heading, Text } from '@stump/components'
import { Construction } from 'lucide-react'
import React, { useMemo } from 'react'
import { Navigate, useParams } from 'react-router'

import SceneContainer from '@/components/SceneContainer'
import paths from '@/paths'

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
		]
	}, [series])

	if (isLoading) {
		return null
	} else if (!series) {
		return <Navigate to={paths.notFound()} />
	}

	return (
		<SceneContainer>
			<div className="flex flex-col items-start gap-y-6 text-left">
				<div className="flex flex-col gap-y-1.5">
					<Breadcrumbs segments={breadcrumbs} trailingSlash />
					<Heading size="lg" className="font-bold">
						Manage
					</Heading>

					<Text size="sm" variant="muted">
						Make changes to this series
					</Text>
				</div>

				<Alert level="warning" rounded="sm" icon={Construction}>
					<Alert.Content>
						Series management is currently under development and has very limited functionality
					</Alert.Content>
				</Alert>

				<SeriesThumbnailSelector series={series} />
			</div>
		</SceneContainer>
	)
}
