import { PREFETCH_STALE_TIME, queryClient, useSDK, useSuspenseGraphQL } from '@stump/client'
import { ButtonOrLink, Heading, Spacer, Text } from '@stump/components'
import { graphql, useFragment, UserPermission } from '@stump/graphql'
import dayjs from 'dayjs'
import sortBy from 'lodash/sortBy'
import { Suspense, useMemo } from 'react'
import { Helmet } from 'react-helmet'
import { useParams } from 'react-router'
import { useMediaMatch } from 'rooks'

import BookCard, { BookCardFragment } from '@/components/book/BookCard'
import { SceneContainer } from '@/components/container'
import LinkBadge from '@/components/LinkBadge'
import ReadMore from '@/components/ReadMore'
import { useAppContext } from '@/context'
import { usePaths } from '@/paths'
import { PDF_EXTENSION } from '@/utils/patterns'

import BookCompletionToggleButton from './BookCompletionToggleButton'
import BookFileInformation from './BookFileInformation'
import BookOverviewSceneHeader from './BookOverviewSceneHeader'
import BookReaderDropdown from './BookReaderDropdown'
import BooksAfterCursor from './BooksAfterCursor'
import DownloadMediaButton from './DownloadMediaButton'
import EmailBookDropdown from './EmailBookDropdown'

const query = graphql(`
	query BookOverviewScene($id: ID!) {
		mediaById(id: $id) {
			id
			...BookCard
			...BookFileInformation
			resolvedName
			extension
			metadata {
				links
				summary
			}
			readHistory {
				completedAt
			}
		}
	}
`)

export const usePrefetchBook = () => {
	const { sdk } = useSDK()
	return (id: string) =>
		queryClient.prefetchQuery({
			queryKey: ['bookOverview', id],
			queryFn: async () => {
				const response = await sdk.execute(query, { id })
				return response
			},
			staleTime: PREFETCH_STALE_TIME,
		})
}

export default function BookOverviewScene() {
	const { id } = useParams()
	const { sdk } = useSDK()
	const {
		data: { mediaById: media },
	} = useSuspenseGraphQL(query, sdk.cacheKey('bookOverview', [id]), {
		id: id || '',
	})
	const { checkPermission, isServerOwner } = useAppContext()

	const paths = usePaths()

	const canDownload = useMemo(() => checkPermission(UserPermission.DownloadFile), [checkPermission])
	const canManage = useMemo(() => checkPermission(UserPermission.ManageLibrary), [checkPermission])

	const isAtLeastTablet = useMediaMatch('(min-width: 640px)')

	if (!media) {
		throw new Error('Book not found')
	}

	const fragmentData = useFragment(BookCardFragment, media)

	const completedAt = sortBy(media.readHistory, ({ completedAt }) =>
		dayjs(completedAt).toDate(),
	).at(-1)?.completedAt
	const links = media.metadata?.links.filter((l) => !!l) ?? []

	return (
		<SceneContainer>
			<Suspense>
				<Helmet>
					<title>Stump | {media.resolvedName}</title>
				</Helmet>

				<div className="flex h-full w-full flex-col gap-4">
					<div className="flex flex-col items-center gap-3 tablet:mb-2 tablet:flex-row tablet:items-start">
						<BookCard key={media.id} fragment={media} readingLink variant="cover" />
						<div className="flex h-full w-full flex-col gap-2 tablet:gap-4">
							<Suspense>
								<BookOverviewSceneHeader id={media.id} />
							</Suspense>
							{completedAt && (
								<Text size="xs" variant="muted">
									{media.readHistory.length > 1 ? 'Last completed' : 'Completed'} on{' '}
									{dayjs(completedAt).format('LLL')}
								</Text>
							)}
							{isAtLeastTablet && <ReadMore text={media.metadata?.summary} />}
							{!isAtLeastTablet && <Spacer />}

							<div className="flex w-full flex-col gap-2 md:flex-row md:items-center">
								<BookReaderDropdown book={fragmentData} />
								<BookCompletionToggleButton book={fragmentData} />
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
								{canDownload && <DownloadMediaButton id={media.id} name={media.resolvedName} />}
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

					{isServerOwner && <BookFileInformation fragment={media} />}
					<BooksAfterCursor cursor={media.id} />
				</div>
			</Suspense>
		</SceneContainer>
	)
}
