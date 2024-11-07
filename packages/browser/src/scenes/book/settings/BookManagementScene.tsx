import { useMediaByIdQuery, useSDK } from '@stump/client'
import { Alert, Breadcrumbs, Button, Heading, Text } from '@stump/components'
import { Construction } from 'lucide-react'
import React, { useMemo } from 'react'
import { Navigate, useParams } from 'react-router'

import { SceneContainer } from '@/components/container'
import paths from '@/paths'
import { formatBookName } from '@/utils/format'

import BookThumbnailSelector from './BookThumbnailSelector'

export default function BookManagementScene() {
	const { sdk } = useSDK()
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
				label: formatBookName(media),
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
			sdk.media.analyze(id)
		}
	}

	function handleDelete() {
		if (id != undefined) {
			sdk.media.delete(id, {
				delete_file: false,
			})
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

				<div className="flex flex-row items-center gap-x-4">
					<Button size="md" variant="primary" onClick={handleAnalyze}>
						Analyze Media
					</Button>

					<Button size="md" variant="danger" onClick={handleDelete}>
						Delete Book
					</Button>
				</div>

				<BookThumbnailSelector book={media} />
			</div>
		</SceneContainer>
	)
}
