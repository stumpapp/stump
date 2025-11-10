import { useSDK } from '@stump/client'
import { OPDSFeed } from '@stump/sdk'
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, View } from 'react-native'
import { FlatGrid } from 'react-native-super-grid'

import { ON_END_REACHED_THRESHOLD } from '~/lib/constants'
import { useDisplay } from '~/lib/hooks'
import { cn } from '~/lib/utils'
import { usePreferencesStore } from '~/stores'

import { useActiveServer } from '../activeServer'
import { BorderAndShadow } from '../BorderAndShadow'
import { TurboImage } from '../Image'
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
	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)

	// Each item will be width 100 OR 135 on tablets
	// And we have the height plus up to 2 lines of text.
	// We want to fill the width of the screen as best as possible. So:
	const itemWidth = useMemo(() => {
		if (isTablet) return 135
		else if (isXSmall) return width / 2
		else return 100
	}, [isTablet, isXSmall, width])
	const itemHeight = useMemo(() => {
		if (isTablet) return 135 / thumbnailRatio
		else if (isXSmall) return width / 2 / thumbnailRatio
		else return 100 / thumbnailRatio
	}, [isTablet, isXSmall, width, thumbnailRatio])

	const itemsPerRow = Math.floor(width / itemWidth)

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
				maxItemsPerRow={itemsPerRow}
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
										'opacity-80': pressed,
										'py-1': isXSmall,
									})}
								>
									<BorderAndShadow
										style={{ borderRadius: 6, borderWidth: 0.3, shadowRadius: 1.41, elevation: 2 }}
									>
										<TurboImage
											className="z-0"
											source={{
												uri: thumbnailURL || '',
												headers: {
													...sdk.customHeaders,
													Authorization: sdk.authorizationHeader || '',
												},
											}}
											resizeMode="stretch"
											resize={itemWidth * 1.5}
											style={{ height: itemHeight, width: itemWidth }}
										/>
									</BorderAndShadow>

									<View style={{ maxWidth: itemWidth }}>
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
				onEndReachedThreshold={ON_END_REACHED_THRESHOLD}
				refreshControl={
					onRefresh ? (
						<RefreshControl refreshing={isRefreshing || false} onRefresh={onRefresh} />
					) : undefined
				}
			/>
		</View>
	)
}
