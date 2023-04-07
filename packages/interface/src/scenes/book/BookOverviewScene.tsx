import { useMediaByIdQuery } from '@stump/client'
import { Heading, Spacer } from '@stump/components'
import { Suspense } from 'react'
import { Helmet } from 'react-helmet'
import { useParams } from 'react-router'
import { useMediaMatch } from 'rooks'

import MediaCard from '../../components/media/MediaCard'
import ReadMore from '../../components/ReadMore'
import TagList from '../../components/tags/TagList'
import BookFileInformation from './BookFileInformation'
import BookLibrarySeriesLinks from './BookLibrarySeriesLinks'
import BookReaderLink from './BookReaderLink'
import BooksAfterCursor from './BooksAfterCursor'

export default function BookOverviewScene() {
	const isAtLeastMedium = useMediaMatch('(min-width: 768px)')

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

	const renderHeader = () => {
		return (
			<div>
				<Heading size="sm">{media.name}</Heading>
				<BookLibrarySeriesLinks
					libraryId={media.series?.library_id}
					seriesId={media.series_id}
					series={media.series}
				/>
			</div>
		)
	}

	return (
		<Suspense>
			<Helmet>
				<title>Stump | {media.name || ''}</title>
			</Helmet>

			<div className="flex h-full w-full flex-col gap-3 p-4">
				<div className="mb-2 flex flex-col items-center space-y-2 md:flex-row md:items-start md:space-x-4 md:space-y-0">
					{!isAtLeastMedium ? renderHeader() : null}
					<MediaCard media={media} readingLink variant="cover" />

					<div className="flex flex-col space-y-4 md:h-full md:flex-1">
						{isAtLeastMedium ? renderHeader() : null}

						<ReadMore text={media.description} />
						<BookReaderLink book={media} />
					</div>
				</div>

				<TagList tags={media.tags || null} />
				<BookFileInformation media={media} />
				<BooksAfterCursor cursor={media} />
			</div>
		</Suspense>
	)
}
