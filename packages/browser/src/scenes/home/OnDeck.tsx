import { PREFETCH_STALE_TIME, useInfiniteSuspenseGraphQL, useSDK } from '@stump/client'
import { Text } from '@stump/components'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import { BookMarked } from 'lucide-react'
import { memo, Suspense, useCallback, useMemo } from 'react'
import { useMediaMatch } from 'rooks'

import HorizontalCardList from '@/components/HorizontalCardList'
import { ThumbnailImage } from '@/components/thumbnail/ThumbnailImage'
import { ThumbnailPlaceholderData } from '@/components/thumbnail/ThumbnailPlaceholder'
import { Link } from '@/context'
import { usePreferences } from '@/hooks/usePreferences'
import { usePaths } from '@/paths'

const IMAGE_WIDTH_MOBILE = 160
const IMAGE_WIDTH_TABLET = 200

const OnDeckBookFragment = graphql(`
	fragment OnDeckBook on Media {
		id
		metadata {
			number
		}
		resolvedName
		seriesPosition
		series {
			mediaCount
		}
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
	query OnDeckBooksWeb($pagination: Pagination!) {
		onDeck(pagination: $pagination) {
			nodes {
				id
				...OnDeckBook
			}
			pageInfo {
				__typename
				... on OffsetPaginationInfo {
					currentPage
					totalPages
					pageSize
					pageOffset
					zeroBased
				}
			}
		}
	}
`)

export const usePrefetchOnDeck = () => {
	const { sdk } = useSDK()
	const client = useQueryClient()
	return useCallback(() => {
		client.prefetchInfiniteQuery({
			queryKey: sdk.cacheKey('onDeck'),
			initialPageParam: {
				offset: {
					pageSize: 20,
					page: 1,
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

export default function OnDeckContainer() {
	return (
		<Suspense>
			<OnDeck />
		</Suspense>
	)
}

function OnDeck() {
	const { t } = useLocaleContext()
	const {
		preferences: { thumbnailRatio },
	} = usePreferences()

	const isAtLeastMedium = useMediaMatch('(min-width: 768px)')

	const imageWidth = isAtLeastMedium ? IMAGE_WIDTH_TABLET : IMAGE_WIDTH_MOBILE
	const listHeight = imageWidth / thumbnailRatio + 17 // +17 for scrollbar

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteSuspenseGraphQL(
		query,
		['onDeck'],
		{
			pagination: { offset: { pageSize: 20, page: 1 } },
		},
	)
	const nodes = data.pages.flatMap((page) => page.onDeck.nodes)

	const handleFetchMore = useCallback(() => {
		if (hasNextPage && !isFetchingNextPage) {
			fetchNextPage()
		}
	}, [fetchNextPage, hasNextPage, isFetchingNextPage])

	const cards = nodes.map((node) => (
		<OnDeckBookCard key={node.id} fragment={node} cardWidth={imageWidth} />
	))

	return (
		<HorizontalCardList
			title={t('homeScene.onDeck.title')}
			items={cards}
			height={listHeight}
			onFetchMore={handleFetchMore}
			emptyState={
				<div className="flex items-start justify-start space-x-3 rounded-lg border border-dashed border-edge-subtle px-4 py-4">
					<span className="rounded-lg border border-edge bg-background-surface p-2">
						<BookMarked className="h-8 w-8 text-foreground-muted" />
					</span>
					<div>
						<Text>{t('homeScene.onDeck.emptyState.heading')}</Text>
						<Text size="sm" variant="muted">
							{t('homeScene.onDeck.emptyState.message')}
						</Text>
					</div>
				</div>
			}
		/>
	)
}

type OnDeckBookCardProps = {
	fragment: FragmentType<typeof OnDeckBookFragment>
	cardWidth: number
}

const OnDeckBookCard = memo(function OnDeckBookCard({ fragment, cardWidth }: OnDeckBookCardProps) {
	const data = useFragment(OnDeckBookFragment, fragment)
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

	const seriesPosition = Number(data.metadata?.number) || data.seriesPosition
	// If seriesPosition is fractional, we show "Book X in series"
	// If it's an integer, we show "Book X of Y"
	// If the integer is more than the total mediaCount, we fallback to "Book X in series"
	const isFractional = !Number.isInteger(seriesPosition)
	const showOfY = !!seriesPosition && !isFractional && seriesPosition <= data.series.mediaCount

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

			<div className="pointer-events-none absolute bottom-0 left-0 right-0 z-30 p-2.5">
				<Text
					className="line-clamp-2 !text-wrap text-lg font-bold leading-tight text-white"
					style={{
						textShadow: '2px 1px 2px rgba(0, 0, 0, 0.5)',
					}}
				>
					{data.resolvedName}
				</Text>

				{seriesPosition != null && (
					<Text
						className="mt-0.5 text-sm font-medium text-gray-200"
						style={{
							textShadow: '2px 1px 2px rgba(0, 0, 0, 0.5)',
						}}
					>
						{showOfY
							? `Book ${seriesPosition} of ${data.series?.mediaCount}`
							: `Book ${seriesPosition} in series`}
					</Text>
				)}
			</div>
		</Link>
	)
})
