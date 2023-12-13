import { useMediaByIdQuery } from '@stump/client'
import { Alert, Divider, Heading, Text } from '@stump/components'
import { Construction } from 'lucide-react'
import React from 'react'
import { Navigate, useParams } from 'react-router'

import SceneContainer from '@/components/SceneContainer'

import paths from '../../../paths'
import BookLibrarySeriesLinks from '../BookLibrarySeriesLinks'
import BookThumbnailSelector from './BookThumbnailSelector'

export default function BookManagementScene() {
	const { id } = useParams()
	if (!id) {
		throw new Error('You must provide a book ID for the reader.')
	}
	const { media, isLoading } = useMediaByIdQuery(id)

	// TODO: loading state...
	if (isLoading) {
		return null
	} else if (!media) {
		return <Navigate to={paths.notFound()} />
	}

	const title = media.metadata?.title || media.name

	return (
		<SceneContainer>
			<div className="flex flex-col items-center text-center md:items-start md:text-left">
				<Heading size="sm">{title}</Heading>

				<BookLibrarySeriesLinks
					libraryId={media.series?.library_id}
					seriesId={media.series_id}
					series={media.series}
					linkSegments={[
						{ label: title, to: paths.bookOverview(id) },
						{ label: 'Manage', noShrink: true },
					]}
				/>

				<Text size="sm" variant="muted" className="mt-2">
					Use this page to make various changes to this book as it exists in the database, such as
					changing the thumbnail or updating metadata
				</Text>
			</div>

			<Divider variant="muted" className="my-3.5" />
			<div className="flex flex-col gap-6 pt-2">
				<Alert level="warning" rounded="sm" icon={Construction}>
					<Alert.Content>
						Book management is currently under construction. There are not many features exposed
						here yet.
					</Alert.Content>
				</Alert>

				<BookThumbnailSelector book={media} />
			</div>
		</SceneContainer>
	)
}
