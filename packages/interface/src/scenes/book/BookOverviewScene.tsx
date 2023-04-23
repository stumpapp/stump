import { useMediaByIdQuery } from '@stump/client'
import { Heading, Spacer, Text } from '@stump/components'
import dayjs from 'dayjs'
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
import DownloadMediaButton from './DownloadMediaButton'

// TODO: frankly, I think this looks like ass. I really want to redesign this page...
// It looks especially bad on mobile. Also, pretty much all of the other overview pages
// look identical, which means they all look poop.
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
	const completedAt = media.read_progresses?.find((p) => !!p.completed_at)?.completed_at

	return (
		<Suspense>
			<Helmet>
				<title>Stump | {media.name || ''}</title>
			</Helmet>

			<div className="flex h-full w-full flex-col gap-4 p-4">
				<div className="mb-2 flex items-start gap-3">
					<MediaCard media={media} readingLink variant="cover" />
					<div className="flex h-full w-full flex-col gap-2 md:gap-4">
						{renderHeader()}
						{completedAt && (
							<Text size="xs" variant="muted">
								Completed on {dayjs(completedAt).format('LLL')}
							</Text>
						)}
						{isAtLeastMedium && <ReadMore text={media.description} />}
						{!isAtLeastMedium && <Spacer />}

						<div className="flex w-full flex-col-reverse gap-1 md:flex-row md:gap-2">
							<BookReaderLink book={media} />
							<DownloadMediaButton media={media} />
						</div>
					</div>
				</div>
				{/* {renderDetails()} */}

				<TagList tags={media.tags || null} />
				<BookFileInformation media={media} />
				<BooksAfterCursor cursor={media} />
			</div>
		</Suspense>
	)
}
