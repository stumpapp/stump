import { FlashList } from '@shopify/flash-list'
import { useSDK } from '@stump/client'
import { OPDSFeed } from '@stump/sdk'
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ON_END_REACHED_THRESHOLD } from '~/lib/constants'

import { useActiveServer } from '../activeServer'
import { GridImageItem } from '../grid'
import { useGridItemSize } from '../grid/useGridItemSize'
import RefreshControl from '../RefreshControl'
import { useFeedTitle } from './useFeedTitle'
import { getPublicationThumbnailURL } from './utils'

type Props = {
	feed: OPDSFeed
	onRefresh?: () => void
	isRefreshing?: boolean
}

export default function PublicationFeed({ feed, onRefresh, isRefreshing }: Props) {
	useFeedTitle(feed)

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

	const { numColumns, paddingHorizontal } = useGridItemSize()

	const publications = data?.pages.flatMap((page) => page.publications) || feed.publications

	const renderItem = useCallback(
		({ item: publication }: { item: (typeof publications)[number] }) => {
			const thumbnailURL = getPublicationThumbnailURL(publication)
			const selfURL = publication.links?.find((link) => link.rel === 'self')?.href

			if (!thumbnailURL) return null

			return (
				<View className="w-full items-center">
					<GridImageItem
						uri={thumbnailURL}
						title={publication.metadata.title}
						href={{
							pathname: '/opds/[id]/publication',
							params: {
								id: serverID,
								url: selfURL,
							},
						}}
					/>
				</View>
			)
		},
		[serverID],
	)

	if (!publications.length) return null

	return (
		<SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
			<FlashList
				data={publications}
				renderItem={renderItem}
				contentContainerStyle={{
					paddingVertical: 16,
					paddingHorizontal: paddingHorizontal,
				}}
				numColumns={numColumns}
				onEndReachedThreshold={ON_END_REACHED_THRESHOLD}
				onEndReached={onEndReached}
				contentInsetAdjustmentBehavior="always"
				ListHeaderComponentStyle={{ paddingBottom: 16, marginHorizontal: -paddingHorizontal }}
				refreshControl={<RefreshControl refreshing={Boolean(isRefreshing)} onRefresh={onRefresh} />}
			/>
		</SafeAreaView>
	)
}
