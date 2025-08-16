import { useSDK } from '@stump/client'
import { OPDSFeed } from '@stump/sdk'
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, View } from 'react-native'
import { FlatGrid } from 'react-native-super-grid'

import { useDisplay } from '~/lib/hooks'
import { cn } from '~/lib/utils'

import { useActiveServer } from '../activeServer'
import { Image } from '../Image'
import RefreshControl from '../RefreshControl'
import { Text } from '../ui'
import FeedTitle from './FeedTitle'
import { getPublicationThumbnailURL } from './utils'

type Props = {
	feed: OPDSFeed
	onRefresh?: () => void
	isRefreshing?: boolean
}

export default function PublicationFeed({ feed, onRefresh, isRefreshing }: Props) {
	const { isTablet, isXSmall, safeWidth: width } = useDisplay()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { sdk } = useSDK()

	const feedURL = feed.links?.find((link) => link.rel === 'self')?.href || ''
	const [pageSize, setPageSize] = useState(() => Math.max(10, feed.publications.length))

	const { data, hasNextPage, fetchNextPage } = useInfiniteQuery({
		initialPageParam: 1,
		queryKey: [sdk.opds.keys.feed, feedURL, 'paged', pageSize],
		queryFn: ({ pageParam = 1 }) => {
			return sdk.opds.feed(feedURL, {
				page: pageParam,
				page_size: pageSize,
			})
		},
		placeholderData: keepPreviousData,
		getNextPageParam: (lastPage) => {
			const metadata = lastPage.metadata
			const numberOfItems = metadata.numberOfItems || feed.metadata.numberOfItems
			const numberOfPages = metadata.itemsPerPage || feed.metadata.itemsPerPage
			if (!numberOfPages || !numberOfItems) return undefined

			const currentPage = metadata.currentPage || 1

			const pagesRemaining = Math.ceil(numberOfItems / numberOfPages) - currentPage
			if (pagesRemaining > 0) {
				return currentPage + 1
			}
			return undefined
		},
		enabled: !!feedURL,
	})

	const firstPageSize = useMemo(() => data?.pages[0]?.metadata?.itemsPerPage, [data])
	useEffect(() => {
		if (firstPageSize && firstPageSize !== pageSize) {
			setPageSize(firstPageSize)
		}
	}, [firstPageSize, pageSize])

	const onEndReached = useCallback(() => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}, [hasNextPage, fetchNextPage])

	const router = useRouter()

	// Each item will be height 150 OR 200 on tablets, plus up to 2 lines of text.
	// We want to fill the width of the screen as best as possible. So:
	const itemWidth = useMemo(() => {
		// isTablet ? 200 * 0.665 : 150 * 0.665
		if (isTablet) {
			return 200 * 0.665
		} else if (isXSmall) {
			return width / 2
		} else {
			return 150 * 0.665
		}
	}, [isTablet, isXSmall, width])
	const itemHeight = useMemo(() => {
		if (isTablet) {
			return 200
		} else if (isXSmall) {
			return (width * 2) / 3 - 1
		} else {
			return 150
		}
	}, [isTablet, isXSmall, width])

	const itemsPerRow = Math.floor(width / itemWidth)
	const availableSpaceX = width - itemsPerRow * itemWidth

	// TODO: fix on xsmall, looks poopy

	const publications = data?.pages.flatMap((page) => page.publications) || feed.publications

	if (!publications.length) return null

	return (
		<View className="flex-1 gap-4">
			<FeedTitle feed={feed} className="justify-center px-6" />

			<FlatGrid
				itemDimension={itemWidth}
				data={publications}
				fixed
				spacing={availableSpaceX / itemsPerRow}
				renderItem={({ item: publication }) => {
					const thumbnailURL = getPublicationThumbnailURL(publication)
					const selfURL = publication.links?.find((link) => link.rel === 'self')?.href

					return (
						<Pressable
							onPress={() =>
								selfURL
									? router.push({
											pathname: '/opds/[id]/publication',
											params: {
												id: serverID,
												url: selfURL,
											},
										})
									: null
							}
						>
							{({ pressed }) => (
								<View
									className={cn('xs:items-center flex', {
										'opacity-90': pressed,
										'py-1': isXSmall,
									})}
								>
									<View className="relative aspect-[2/3] overflow-hidden rounded-lg">
										<Image
											className="z-0"
											source={{
												uri: thumbnailURL,
												headers: {
													Authorization: sdk.authorizationHeader,
												},
											}}
											contentFit="scale-down"
											style={{
												height: itemHeight,
												width: itemWidth,
											}}
										/>
									</View>

									<View
										style={{
											maxWidth: isTablet ? 200 * 0.665 : 150 * 0.665,
										}}
									>
										<Text className="xs:text-center mt-2 line-clamp-2 text-sm tablet:text-sm">
											{publication.metadata.title}
										</Text>
									</View>
								</View>
							)}
						</Pressable>
					)
				}}
				keyExtractor={(item) => item.metadata.title}
				onEndReached={onEndReached}
				onEndReachedThreshold={0.75}
				refreshControl={
					onRefresh ? (
						<RefreshControl refreshing={isRefreshing || false} onRefresh={onRefresh} />
					) : undefined
				}
			/>
		</View>
	)
}
