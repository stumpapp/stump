import { useMediaByIdQuery } from '@stump/client'
import { Badge, ButtonOrLink, Heading, Spacer, Text } from '@stump/components'
import dayjs from 'dayjs'
import { Suspense, useEffect } from 'react'
import { Helmet } from 'react-helmet'
import { useParams } from 'react-router'
import { useMediaMatch } from 'rooks'

import LinkBadge from '../../components/LinkBadge'
import MediaCard from '../../components/media/MediaCard'
import ReadMore from '../../components/ReadMore'
import SceneContainer from '../../components/SceneContainer'
import TagList from '../../components/tags/TagList'
import { useAppContext } from '../../context'
import paths from '../../paths'
import { PDF_EXTENSION } from '../../utils/patterns'
import BookFileInformation from './BookFileInformation'
import BookLibrarySeriesLinks from './BookLibrarySeriesLinks'
import BookReaderLink from './BookReaderLink'
import BooksAfterCursor from './BooksAfterCursor'
import DownloadMediaButton from './DownloadMediaButton'

// TODO: redesign page?
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

	const { media, isLoading, remove } = useMediaByIdQuery(id)

	useEffect(
		() => {
			return () => {
				remove()
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	)

	if (isLoading) {
		return null
	} else if (!media) {
		throw new Error('Media not found')
	}

	const renderHeader = () => {
		return (
			<div className="flex flex-col items-center text-center md:items-start md:text-left">
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
	const genres = media.metadata?.genre?.filter((g) => !!g) ?? []
	const links = media.metadata?.links?.filter((l) => !!l) ?? []

	return (
		<SceneContainer>
			<Suspense>
				<Helmet>
					<title>Stump | {media.name || ''}</title>
				</Helmet>

				<div className="flex h-full w-full flex-col gap-4">
					<div className="flex flex-col items-center gap-3 md:mb-2 md:flex-row md:items-start">
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

							<div className="flex w-full flex-col gap-2 md:flex-row">
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

							{!isAtLeastMedium && !!media.metadata?.summary && (
								<div>
									<Heading size="xs" className="mb-0.5">
										Summary
									</Heading>
									<ReadMore text={media.metadata?.summary} />
								</div>
							)}
						</div>
					</div>

					{!!genres.length && (
						<div className="flex flex-row space-x-2">
							{genres.map((genre) => (
								<Badge key={genre} variant="primary">
									{genre}
								</Badge>
							))}
						</div>
					)}

					{!!links.length && (
						<div className="flex flex-row space-x-2">
							{links.map((link) => (
								<LinkBadge key={link} href={link} />
							))}
						</div>
					)}

					{isServerOwner && <BookFileInformation media={media} />}
					<BooksAfterCursor cursor={media} />
				</div>
			</Suspense>
		</SceneContainer>
	)
}
