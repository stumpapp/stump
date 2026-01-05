import { PREFETCH_STALE_TIME, useInfiniteSuspenseGraphQL, useSDK } from '@stump/client'
import { Text } from '@stump/components'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { BookX } from 'lucide-react'
import { memo, Suspense, useCallback, useMemo } from 'react'
import { useMediaMatch } from 'rooks'

import MultiRowHorizontalCardList from '@/components/MultiRowHorizontalCardList'
import { ThumbnailImage } from '@/components/thumbnail/ThumbnailImage'
import { ThumbnailPlaceholderData } from '@/components/thumbnail/ThumbnailPlaceholder'
import { Link } from '@/context'
import { usePreferences } from '@/hooks/usePreferences'
import { usePaths } from '@/paths'

dayjs.extend(relativeTime)

const IMAGE_WIDTH_MOBILE = 112
const IMAGE_WIDTH_TABLET = 140

const RecentlyAddedBookFragment = graphql(`
	fragment RecentlyAddedBook on Media {
		id
		resolvedName
		createdAt
		thumbnail {
			url
			metadata {
				averageColor
				colors {
					color
					percentage
				}
				thumbhash
			}
		}
	}
`)

const query = graphql(`
	query RecentlyAddedMedia($pagination: Pagination!) {
		recentlyAddedMedia(pagination: $pagination) {
			nodes {
				id
				...RecentlyAddedBook
			}
			pageInfo {
				__typename
				... on CursorPaginationInfo {
					currentCursor
					nextCursor
					limit
				}
			}
		}
	}
`)

export const usePrefetchRecentlyAddedMedia = () => {
	const { sdk } = useSDK()
	const client = useQueryClient()
	return useCallback(() => {
		client.prefetchInfiniteQuery({
			queryKey: ['recentlyAddedMedia'],
			initialPageParam: {
				cursor: {
					limit: 20,
				},
			},
			queryFn: ({ pageParam }) => {
				return sdk.execute(query, {
					pagination: pageParam,
				})
			},
			staleTime: PREFETCH_STALE_TIME,
		})
	}, [sdk, client])
}

function RecentlyAddedMedia() {
	const { t } = useLocaleContext()
	const {
		preferences: { thumbnailRatio },
	} = usePreferences()

	const isAtLeastMedium = useMediaMatch('(min-width: 768px)')

	const cardWidth = isAtLeastMedium ? IMAGE_WIDTH_TABLET : IMAGE_WIDTH_MOBILE
	const cardHeight = cardWidth / thumbnailRatio

	const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteSuspenseGraphQL(
		query,
		['recentlyAddedMedia'],
		{
			pagination: { cursor: { limit: 20 } },
		},
	)
	const nodes = data.pages.flatMap((page) => page.recentlyAddedMedia.nodes)

	const handleFetchMore = useCallback(() => {
		if (hasNextPage && !isFetchingNextPage) {
			fetchNextPage()
		}
	}, [hasNextPage, isFetchingNextPage, fetchNextPage])

	const emptyState = (
		<div className="flex items-start justify-start space-x-3 rounded-lg border border-dashed border-edge-subtle px-4 py-4">
			<span className="rounded-lg border border-edge bg-background-surface p-2">
				<BookX className="h-8 w-8 text-foreground-muted" />
			</span>
			<div>
				<Text>{t('homeScene.recentlyAddedBooks.emptyState.heading')}</Text>
				<Text size="sm" variant="muted">
					{t('homeScene.recentlyAddedBooks.emptyState.message')}
				</Text>
			</div>
		</div>
	)

	return (
		<MultiRowHorizontalCardList
			title={t('homeScene.recentlyAddedBooks.title')}
			items={nodes}
			keyExtractor={(node) => node.id}
			renderItem={(node) => <RecentlyAddedBookCard fragment={node} cardWidth={cardWidth} />}
			cardHeight={cardHeight}
			onFetchMore={handleFetchMore}
			emptyState={emptyState}
		/>
	)
}

export default function RecentlyAddedMediaContainer() {
	return (
		<Suspense>
			<RecentlyAddedMedia />
		</Suspense>
	)
}

type RecentlyAddedBookCardProps = {
	fragment: FragmentType<typeof RecentlyAddedBookFragment>
	cardWidth: number
}

const RecentlyAddedBookCard = memo(function RecentlyAddedBookCard({
	fragment,
	cardWidth,
}: RecentlyAddedBookCardProps) {
	const data = useFragment(RecentlyAddedBookFragment, fragment)
	const paths = usePaths()
	const {
		preferences: { thumbnailRatio },
	} = usePreferences()

	const placeholderData: ThumbnailPlaceholderData | undefined = useMemo(() => {
		const meta = data.thumbnail.metadata
		if (!meta) return undefined
		return {
			averageColor: meta.averageColor,
			colors: meta.colors,
			thumbhash: meta.thumbhash,
		}
	}, [data.thumbnail.metadata])

	const gradient = {
		colors: ['transparent', 'transparent', 'rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.85)'],
		direction: 'to bottom',
	}

	return (
		<Link
			to={paths.bookOverview(data.id)}
			className="group relative block flex-shrink-0 overflow-hidden rounded-lg transition-opacity hover:opacity-90"
			style={{ width: cardWidth }}
		>
			<ThumbnailImage
				src={data.thumbnail.url}
				alt={data.resolvedName}
				size={{ width: cardWidth, height: cardWidth / thumbnailRatio }}
				placeholderData={placeholderData}
				gradient={gradient}
				borderAndShadowStyle={{
					borderRadius: 8,
					shadowColor: 'rgba(0, 0, 0, 0.2)',
					shadowRadius: 2,
				}}
			/>

			<div className="pointer-events-none absolute bottom-0 left-0 right-0 z-30 p-2">
				<Text
					className="line-clamp-2 !text-wrap text-sm font-semibold leading-tight text-white"
					style={{
						textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)',
					}}
				>
					{data.resolvedName}
				</Text>
				<Text
					className="mt-0.5 text-xs text-gray-200"
					style={{
						textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)',
					}}
				>
					{dayjs(data.createdAt).fromNow()}
				</Text>
			</div>
		</Link>
	)
})
