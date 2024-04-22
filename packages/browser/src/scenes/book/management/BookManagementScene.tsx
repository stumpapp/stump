import { mediaApi } from '@stump/api'
import { useMediaByIdQuery } from '@stump/client'
import { Alert, Breadcrumbs, Button, Heading, Text } from '@stump/components'
import { Construction } from 'lucide-react'
import React, { useMemo } from 'react'
import { Navigate, useParams } from 'react-router'

import { SceneContainer } from '@/components/container'
import paths from '@/paths'

import BookThumbnailSelector from './BookThumbnailSelector'

export default function BookManagementScene() {
	const { id } = useParams()

	if (!id) {
		throw new Error('You must provide a book ID for the reader')
	}
	const { media, isLoading } = useMediaByIdQuery(id, {
		params: {
			load_library: true,
			load_series: true,
		},
	})

	const breadcrumbs = useMemo(() => {
		if (!media) return []

		const { series } = media

		return [
			...(series?.library
				? [{ label: series.library.name, to: paths.librarySeries(series.library.id) }]
				: []),
			...(series
				? [
						{
							label: series.metadata?.title || series.name,
							to: paths.seriesOverview(series.id),
						},
					]
				: []),
			{
				label: media.metadata?.title || media.name,
				to: paths.bookOverview(media.id),
			},
		]
	}, [media])

	if (isLoading) {
		return null
	} else if (!media) {
		return <Navigate to={paths.notFound()} />
	}

	function handleAnalyze() {
		if (id != undefined) {
			mediaApi.startMediaAnalysis(id)
		}
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
						Make changes to this book
					</Text>
				</div>

				<Alert level="warning" rounded="sm" icon={Construction}>
					<Alert.Content>
						Book management is currently under development and has very limited functionality
					</Alert.Content>
				</Alert>

				<Button size="md" variant="primary" onClick={handleAnalyze}>
					Analyze Media
				</Button>

				<BookThumbnailSelector book={media} />
			</div>
		</SceneContainer>
	)
}
