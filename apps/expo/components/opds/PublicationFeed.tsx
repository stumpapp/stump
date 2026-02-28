import { FlashList } from '@shopify/flash-list'
import { useSDK } from '@stump/client'
import { OPDSFeed, resolveUrl } from '@stump/sdk'
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ON_END_REACHED_THRESHOLD } from '~/lib/constants'

import { useActiveServer } from '../activeServer'
import { GridImageItem } from '../grid'
import { useGridItemSize } from '../grid/useGridItemSize'
import RefreshControl from '../RefreshControl'
import { getPublicationThumbnailURL } from './utils'

type Props = {
	feed: OPDSFeed
	onRefresh?: () => void
	isRefreshing?: boolean
	ListHeaderComponent?: React.ReactElement
}

export default function PublicationFeed({
	feed,
	onRefresh,
	isRefreshing,
	ListHeaderComponent,
}: Props) {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { sdk } = useSDK()

	const feedURL = feed.links?.find((link) => link.rel === 'self')?.href || ''
	const [pageSize, setPageSize] = useState(() => feed.metadata.itemsPerPage || 20)

	// Note: We cannot assume indexing of page query params, and I don't see it definfed in
	// the spec, so we just have to rely on the next link
	const getNextPageParam = (lastPage: OPDSFeed) => {
		const links = lastPage.links || []
		const nextLink = links.find((link) => link.rel === 'next')
		if (nextLink) {
			return nextLink.href
		}
		return undefined
	}

	const { data, hasNextPage, fetchNextPage } = useInfiniteQuery({
		initialPageParam: feedURL,
		queryKey: [sdk.opds.keys.feed, feedURL, 'paged', pageSize],
		queryFn: ({ pageParam = feedURL }) => {
			return sdk.opds.feed(pageParam)
		},
		placeholderData: keepPreviousData,
		getNextPageParam,
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
			const thumbnailURL = getPublicationThumbnailURL(publication, sdk.rootURL)
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
								url: selfURL ? resolveUrl(selfURL, sdk.rootURL) : undefined,
							},
						}}
					/>
				</View>
			)
		},
		[serverID, sdk.rootURL],
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
				ListHeaderComponent={ListHeaderComponent}
				ListHeaderComponentStyle={{ paddingBottom: 16, marginHorizontal: -paddingHorizontal }}
				refreshControl={<RefreshControl refreshing={Boolean(isRefreshing)} onRefresh={onRefresh} />}
			/>
		</SafeAreaView>
	)
}
