import { useMediaByIdQuery } from '@stump/client'
import { Heading } from '@stump/components'
import { Suspense } from 'react'
import { Helmet } from 'react-helmet'
import { useParams } from 'react-router'

import MediaCard from '../../components/media/MediaCard'
import ReadMore from '../../components/ReadMore'
import TagList from '../../components/tags/TagList'
import BookFileInformation from './BookFileInformation'
import BookLibrarySeriesLinks from './BookLibrarySeriesLinks'
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
						<TagList tags={media.tags || null} />
					</div>
				</div>

				<BookFileInformation media={media} />

				<BooksAfterCursor cursor={media} />
			</div>
		</Suspense>
	)
}
