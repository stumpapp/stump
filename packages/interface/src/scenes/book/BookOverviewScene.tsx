import { useMediaByIdQuery } from '@stump/client'
import { Badge, ButtonOrLink, Heading, Spacer, Text } from '@stump/components'
import dayjs from 'dayjs'
import { Suspense } from 'react'
import { Helmet } from 'react-helmet'
import { useParams } from 'react-router'
import { useMediaMatch } from 'rooks'

import LinkBadge from '../../components/LinkBadge'
import MediaCard from '../../components/media/MediaCard'
import ReadMore from '../../components/ReadMore'
import TagList from '../../components/tags/TagList'
import { useAppContext } from '../../context'
import paths from '../../paths'
import { PDF_EXTENSION } from '../../utils/patterns'
import BookFileInformation from './BookFileInformation'
import BookLibrarySeriesLinks from './BookLibrarySeriesLinks'
import BookReaderLink from './BookReaderLink'
import BooksAfterCursor from './BooksAfterCursor'
import DownloadMediaButton from './DownloadMediaButton'

// TODO: frankly, I think this looks like ass. I really want to redesign this page...
// It looks especially bad on mobile. Also, pretty much all of the other overview pages
// look identical, which means they all look poop.
// TODO: with metadata being collected now, there is a lot more information to display:
// - publish date
// - publisher
// - pencillers, authors, etc
// - links
// - featured characters
export default function BookOverviewScene() {
	const { isServerOwner } = useAppContext()
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

				<TagList tags={media.tags || null} baseUrl={paths.bookSearch()} />
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
						{isAtLeastMedium && <ReadMore text={media.metadata?.summary} />}
						{!isAtLeastMedium && <Spacer />}

						<div className="flex w-full flex-col-reverse gap-1 md:flex-row md:gap-2">
							<BookReaderLink book={media} />
							{media.extension?.match(PDF_EXTENSION) && (
								<ButtonOrLink
									variant="outline"
									href={paths.bookReader(media.id, { isPdf: true, isStreaming: false })}
									title="Read with the native PDF viewer"
									className="w-full md:w-auto"
								>
									Read with the native PDF viewer
								</ButtonOrLink>
							)}
							<DownloadMediaButton media={media} />
						</div>
					</div>
				</div>

				{!!media.metadata?.genre?.length && (
					<div className="flex flex-row space-x-2">
						{media.metadata?.genre?.map((genre) => (
							<Badge key={genre} variant="primary">
								{genre}
							</Badge>
						))}
					</div>
				)}

				{!!media.metadata?.links?.length && (
					<div className="flex flex-row space-x-2">
						{media.metadata?.links?.map((link) => (
							<LinkBadge key={link} href={link} />
						))}
					</div>
				)}

				{isServerOwner && <BookFileInformation media={media} />}
				<BooksAfterCursor cursor={media} />
			</div>
		</Suspense>
	)
}
