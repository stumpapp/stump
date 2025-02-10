import { useMediaByIdQuery } from '@stump/client'
import { ButtonOrLink, Heading, Spacer, Text } from '@stump/components'
import dayjs from 'dayjs'
import sortBy from 'lodash/sortBy'
import { Suspense, useEffect, useMemo } from 'react'
import { Helmet } from 'react-helmet'
import { useParams } from 'react-router'
import { useMediaMatch } from 'rooks'

import MediaCard from '@/components/book/BookCard'
import { SceneContainer } from '@/components/container'
import LinkBadge from '@/components/LinkBadge'
import ReadMore from '@/components/ReadMore'
import { formatBookName } from '@/utils/format'

import { useAppContext } from '../../context'
import paths from '../../paths'
import { PDF_EXTENSION } from '../../utils/patterns'
import BookCompletionToggleButton from './BookCompletionToggleButton'
import BookFileInformation from './BookFileInformation'
import BookReaderDropdown from './BookReaderDropdown'
import BooksAfterCursor from './BooksAfterCursor'
import DownloadMediaButton from './DownloadMediaButton'
import EmailBookDropdown from './EmailBookDropdown'
import BookOverviewSceneHeader from './BookOverviewSceneHeader'

export default function BookOverviewScene() {
	const { checkPermission, isServerOwner } = useAppContext()

	const canDownload = useMemo(() => checkPermission('file:download'), [checkPermission])
	const canManage = useMemo(() => checkPermission('library:manage'), [checkPermission])

	const isAtLeastTablet = useMediaMatch('(min-width: 640px)')

	const { id } = useParams()
	if (!id) {
		throw new Error('Book id is required for this route.')
	}

	const { media, isLoading, remove } = useMediaByIdQuery(id)

	useEffect(() => {
		return () => {
			remove()
		}
	}, [remove])

	if (isLoading) {
		return null
	} else if (!media) {
		throw new Error('Media not found')
	}

	const completedAt = sortBy(media.finished_reading_sessions, ({ completed_at }) =>
		dayjs(completed_at).toDate(),
	).at(-1)?.completed_at
	const links = media.metadata?.links?.filter((l) => !!l) ?? []

	return (
		<SceneContainer>
			<Suspense>
				<Helmet>
					<title>Stump | {formatBookName(media)}</title>
				</Helmet>

				<div className="flex h-full w-full flex-col gap-4">
					<div className="flex flex-col items-center gap-3 tablet:mb-2 tablet:flex-row tablet:items-start">
						<MediaCard media={media} readingLink variant="cover" />
						<div className="flex h-full w-full flex-col gap-2 tablet:gap-4">
							<BookOverviewSceneHeader media={media} />
							{completedAt && (
								<Text size="xs" variant="muted">
									Completed on {dayjs(completedAt).format('LLL')}
								</Text>
							)}
							{isAtLeastTablet && <ReadMore text={media.metadata?.summary} />}
							{!isAtLeastTablet && <Spacer />}

							<div className="flex w-full flex-col gap-2 md:flex-row md:items-center">
								<BookReaderDropdown book={media} />
								<BookCompletionToggleButton book={media} />
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
								{canManage && (
									<ButtonOrLink variant="subtle" href={paths.bookManagement(media.id)}>
										Manage
									</ButtonOrLink>
								)}
								{canDownload && <DownloadMediaButton media={media} />}
								<EmailBookDropdown mediaId={media.id} />
							</div>

							{!isAtLeastTablet && !!media.metadata?.summary && (
								<div>
									<Heading size="xs" className="mb-0.5">
										Summary
									</Heading>
									<ReadMore text={media.metadata?.summary} />
								</div>
							)}
						</div>
					</div>

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
