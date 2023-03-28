import { useMediaByIdQuery } from '@stump/client'
import { Heading, Link, Text } from '@stump/components'
import { Suspense } from 'react'
import { Helmet } from 'react-helmet'
import { useParams } from 'react-router'

import MediaCard from '../../components/media/MediaCard'
import TagList from '../../components/tags/TagList'
import { formatBytes } from '../../utils/format'
import BooksAfterCursor from './BooksAfterCursor'

export default function BookOverviewScene() {
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

			<div className="flex h-full w-full flex-col space-y-3 p-4">
				<div className="flex items-start space-x-4">
					<MediaCard media={media!} readingLink />
					<div className="flex h-full flex-1 flex-col space-y-4">
						<div>
							<Heading size="sm">{media.name}</Heading>
							{media?.series && (
								<Link href={`/series/${media.series.id}`}>{media.series.name}</Link>
							)}
						</div>

						{/* <ReadMore text={media.description} /> */}
						{/* TODO: I want this at the bottom of the container here, but layout needs to be tweaked and I am tired. */}
						<TagList tags={media.tags || null} />
					</div>
				</div>

				<div className="flex flex-col space-y-2 pt-2 text-sm">
					<Heading size="md">File Information</Heading>
					<div className="flex space-x-4">
						<Text>Size: {formatBytes(media.size)}</Text>
						<Text>Kind: {media.extension?.toUpperCase()}</Text>
					</div>
					<Text>Checksum: {media.checksum}</Text>
					<Text>Path: {media.path}</Text>
				</div>
				<BooksAfterCursor cursor={media} />
			</div>
		</Suspense>
	)
}
