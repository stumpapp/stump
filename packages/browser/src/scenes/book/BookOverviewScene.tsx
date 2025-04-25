import { queryClient, useMediaByIdQuery, useSDK, useSuspenseGraphQL } from '@stump/client'
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

import { useAppContext } from '../../context'
import paths from '../../paths'
import { PDF_EXTENSION } from '../../utils/patterns'
import BooksAfterCursor from './BooksAfterCursor'
import { graphql } from '@stump/graphql'

const query = graphql(`
	query BookOverviewSceneQuery($id: ID!) {
		mediaById(id: $id) {
			id
			extension
			metadata {
				links
				summary
			}
			resolvedName
			pages
			size
			status
			thumbnail {
				url
			}
			readProgress {
				percentageCompleted
				epubcfi
				page
			}
			readHistory {
				__typename
				completedAt
			}
		}
	}
`)

export const usePrefetchBook = (id: string) => {
	const { sdk } = useSDK()
	return () =>
		queryClient.prefetchQuery({
			queryKey: ['bookOverview', id],
			queryFn: async () => {
				const response = await sdk.execute(query, { id })
				return response
			},
		})
}

export default function BookOverviewScene() {
	const { id } = useParams()
	const {
		data: { mediaById: media },
	} = useSuspenseGraphQL(query, ['bookOverview', id], {
		id: id || '',
	})
	const { checkPermission, isServerOwner } = useAppContext()

	const canDownload = useMemo(() => checkPermission('file:download'), [checkPermission])
	const canManage = useMemo(() => checkPermission('library:manage'), [checkPermission])

	const isAtLeastTablet = useMediaMatch('(min-width: 640px)')

	if (!media) {
		throw new Error('Book not found')
	}

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
						<MediaCard data={media} readingLink variant="cover" />
						<div className="flex h-full w-full flex-col gap-2 tablet:gap-4">
							{/* <BookOverviewSceneHeader media={media} /> */}
							<Heading size="sm">{media.resolvedName}</Heading>
							{completedAt && (
								<Text size="xs" variant="muted">
									Completed on {dayjs(completedAt).format('LLL')}
								</Text>
							)}
							{isAtLeastTablet && <ReadMore text={media.metadata?.summary} />}
							{!isAtLeastTablet && <Spacer />}

							<div className="flex w-full flex-col gap-2 md:flex-row md:items-center">
								{/* <BookReaderDropdown book={media} /> */}
								{/* <BookCompletionToggleButton book={media} /> */}
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
								{/* {canDownload && <DownloadMediaButton media={media} />} */}
								{/* <EmailBookDropdown mediaId={media.id} /> */}
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

					{/* {isServerOwner && <BookFileInformation media={media} />} */}
					<BooksAfterCursor cursor={media.id} />
				</div>
			</Suspense>
		</SceneContainer>
	)
}
