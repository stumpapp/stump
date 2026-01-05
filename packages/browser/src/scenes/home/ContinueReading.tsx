import { PREFETCH_STALE_TIME, useInfiniteSuspenseGraphQL, useSDK } from '@stump/client'
import { Heading, ProgressBar, Text } from '@stump/components'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { BookMarked } from 'lucide-react'
import { memo, Suspense, useCallback, useMemo } from 'react'
import { useMediaMatch } from 'rooks'

import HorizontalCardList from '@/components/HorizontalCardList'
import { ThumbnailImage } from '@/components/thumbnail/ThumbnailImage'
import { ThumbnailPlaceholderData } from '@/components/thumbnail/ThumbnailPlaceholder'
import { Link } from '@/context'
import { usePreferences } from '@/hooks/usePreferences'
import { usePaths } from '@/paths'

dayjs.extend(relativeTime)

const IMAGE_WIDTH_MOBILE = 200
const IMAGE_WIDTH_TABLET = 220

const ContinueReadingBookFragment = graphql(`
	fragment ContinueReadingBook on Media {
		id
		resolvedName
		pages
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
		readProgress {
			percentageCompleted
			epubcfi
			page
			updatedAt
		}
	}
`)

const query = graphql(`
	query ContinueReadingMedia($pagination: Pagination!) {
		keepReading(pagination: $pagination) {
			nodes {
				id
				...ContinueReadingBook
			}
			pageInfo {
				__typename
				... on CursorPaginationInfo {
					currentCursor
					nextCursor
					limit
				}
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

export const usePrefetchContinueReading = () => {
	const { sdk } = useSDK()
	const client = useQueryClient()
	return useCallback(() => {
		client.prefetchInfiniteQuery({
			queryKey: sdk.cacheKey('inProgress'),
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

export default function ContinueReadingContainer() {
	return (
		<Suspense>
			<ContinueReading />
		</Suspense>
	)
}

function ContinueReading() {
	const { sdk } = useSDK()
	const { t } = useLocaleContext()
	const isAtLeastMedium = useMediaMatch('(min-width: 768px)')
	const {
		preferences: { thumbnailRatio },
	} = usePreferences()
	const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteSuspenseGraphQL(
		query,
		[sdk.cacheKeys.inProgress],
		{
			pagination: { offset: { pageSize: 20, page: 1 } },
		},
	)

	const nodes = useMemo(() => data.pages.flatMap((page) => page.keepReading.nodes), [data])

	const imageWidth = isAtLeastMedium ? IMAGE_WIDTH_TABLET : IMAGE_WIDTH_MOBILE
	const listHeight = imageWidth / thumbnailRatio + 17 // +17 for scrollbar

	const handleFetchMore = useCallback(() => {
		if (hasNextPage && !isFetchingNextPage) {
			fetchNextPage()
		}
	}, [fetchNextPage, hasNextPage, isFetchingNextPage])

	if (!nodes.length) {
		return (
			<div className="flex flex-col space-y-2">
				<Heading size="sm">{t('homeScene.continueReading.title')}</Heading>
				<div className="flex items-start justify-start space-x-3 rounded-lg border border-dashed border-edge-subtle px-4 py-4">
					<span className="rounded-lg border border-edge bg-background-surface p-2">
						<BookMarked className="h-8 w-8 text-foreground-muted" />
					</span>
					<div>
						<Text>{t('homeScene.continueReading.emptyState.heading')}</Text>
						<Text size="sm" variant="muted">
							{t('homeScene.continueReading.emptyState.message')}
						</Text>
					</div>
				</div>
			</div>
		)
	}

	const cards = nodes.map((node) => <ContinueReadingCard key={node.id} fragment={node} />)

	return (
		<HorizontalCardList
			title={t('homeScene.continueReading.title')}
			items={cards}
			height={listHeight}
			onFetchMore={handleFetchMore}
		/>
	)
}

type ContinueReadingCardProps = {
	fragment: FragmentType<typeof ContinueReadingBookFragment>
}

const ContinueReadingCard = memo(function ContinueReadingCard({
	fragment,
}: ContinueReadingCardProps) {
	const isAtLeastMedium = useMediaMatch('(min-width: 768px)')
	const width = isAtLeastMedium ? IMAGE_WIDTH_TABLET : IMAGE_WIDTH_MOBILE
	const data = useFragment(ContinueReadingBookFragment, fragment)
	const paths = usePaths()

	const {
		preferences: { thumbnailRatio },
	} = usePreferences()

	const progress = useMemo(() => {
		if (!data.readProgress) return null

		const { epubcfi, percentageCompleted, page } = data.readProgress
		if (epubcfi && percentageCompleted) {
			return Math.round(percentageCompleted * 100)
		} else if (page) {
			const percent = Math.round((page / data.pages) * 100)
			return Math.min(Math.max(percent, 0), 100)
		}

		return null
	}, [data.readProgress, data.pages])

	const placeholderData: ThumbnailPlaceholderData | undefined = useMemo(() => {
		const meta = data.thumbnail.metadata
		if (!meta) return undefined
		return {
			averageColor: meta.averageColor,
			colors: meta.colors,
			thumbhash: meta.thumbhash,
		}
	}, [data.thumbnail.metadata])

	const isEbookProgress = !!data.readProgress?.epubcfi
	const pagesLeft = data.pages - (data.readProgress?.page || 0)
	const progressPercent = progress ?? 0

	const gradient = {
		colors: ['transparent', 'transparent', 'rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.85)'],
		direction: 'to bottom',
	}

	return (
		<Link
			to={paths.bookOverview(data.id)}
			className="group relative block flex-shrink-0 overflow-hidden rounded-xl transition-opacity hover:opacity-90"
			style={{ width }}
		>
			<ThumbnailImage
				src={data.thumbnail.url}
				alt={data.resolvedName}
				size={{ width, height: width / thumbnailRatio }}
				placeholderData={placeholderData}
				gradient={gradient}
				borderAndShadowStyle={{
					borderRadius: 12,
					shadowColor: 'rgba(0, 0, 0, 0.2)',
					shadowRadius: 2,
				}}
			/>

			<div className="pointer-events-none absolute bottom-0 left-0 right-0 z-30 flex flex-col gap-2 p-2.5">
				<Text
					className="line-clamp-2 !text-wrap text-sm font-semibold leading-tight text-white md:text-base"
					style={{
						textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)',
					}}
				>
					{data.resolvedName}
				</Text>

				<div className="flex items-center justify-between gap-2">
					{!isEbookProgress && !!data.readProgress?.page && data.readProgress.page > 0 && (
						<Text size="xs" className="text-gray-200 opacity-90">
							{pagesLeft} {pagesLeft === 1 ? 'page' : 'pages'} left
						</Text>
					)}

					{isEbookProgress && progressPercent > 0 && (
						<Text size="xs" className="text-gray-200 opacity-90">
							{progressPercent}%
						</Text>
					)}

					{data.readProgress?.updatedAt && (
						<Text size="xs" className="text-gray-200 opacity-90">
							{dayjs(data.readProgress.updatedAt).fromNow()}
						</Text>
					)}
				</div>

				{progressPercent > 0 && (
					<ProgressBar
						value={progressPercent}
						max={100}
						size="sm"
						className="h-1 rounded-full bg-[#898d94]"
						indicatorClassName="bg-[#f5f3ef]"
					/>
				)}
			</div>
		</Link>
	)
})
