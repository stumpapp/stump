import { useMediaByIdQuery } from '@stump/client'
import { Heading, Link, Text } from '@stump/components'
import { Suspense } from 'react'
import { Helmet } from 'react-helmet'
import { useParams } from 'react-router'

import MediaCard from '../../components/media/MediaCard'
import ReadMore from '../../components/ReadMore'
import TagList from '../../components/tags/TagList'
import { useAppContext } from '../../context'
import { formatBytes } from '../../utils/format'
import BookLibrarySeriesLinks from './BookLibrarySeriesLinks'
import BooksAfterCursor from './BooksAfterCursor'

export default function BookOverviewScene() {
	const { isServerOwner } = useAppContext()
	const { id } = useParams()

	if (!id) {
		throw new Error('Book id is required for this route.')
	}

	const { media, isLoading } = useMediaByIdQuery(id)

	if (isLoading) {
		return null
	} else if (!media) {
		throw new Error('Media not found')
	}

	return (
		<Suspense>
			<Helmet>
				<title>Stump | {media.name || ''}</title>
			</Helmet>

			<div className="flex h-full w-full flex-col gap-3 p-4">
				<div className="flex items-start space-x-4">
					<MediaCard media={media} readingLink variant="cover" />

					<div className="flex h-full flex-1 flex-col space-y-4">
						<div>
							<Heading size="sm">{media.name}</Heading>
							<BookLibrarySeriesLinks
								libraryId={media.series?.library_id}
								seriesId={media.series_id}
								series={media.series}
							/>
						</div>

						<ReadMore text={media.description} />
						{/* TODO: I want this at the bottom of the container here, but layout needs to be tweaked and I am tired. */}
						<TagList tags={media.tags || null} />
					</div>
				</div>

				<div className="flex flex-col space-y-1.5 pb-3 pt-2 text-sm">
					<Heading size="xs">File Information</Heading>
					<div className="flex space-x-4">
						<Text size="sm">Size: {formatBytes(media.size)}</Text>
						<Text size="sm">Kind: {media.extension?.toUpperCase()}</Text>
					</div>
					<Text size="sm">Checksum: {media.checksum}</Text>
					{isServerOwner && <Text size="sm">Path: {media.path}</Text>}
				</div>

				<BooksAfterCursor cursor={media} />
			</div>
		</Suspense>
	)
}
