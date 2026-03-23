import { FlashList } from '@shopify/flash-list'
import { useSDK } from '@stump/client'
import { OPDSPublication, resolveUrl } from '@stump/sdk'
import { useRouter } from 'expo-router'
import { useCallback } from 'react'
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ON_END_REACHED_THRESHOLD } from '~/lib/constants'

import { useActiveServer } from '../activeServer'
import { GridImageItem } from '../grid'
import { useGridItemSize } from '../grid/useGridItemSize'
import RefreshControl from '../RefreshControl'
import { getPublicationThumbnailURL, hasLinkRel } from './utils'

type Props = {
	publications: OPDSPublication[]
	hasNextPage: boolean
	fetchNextPage: () => void
	onRefresh?: () => void
	isRefreshing?: boolean
	ListHeaderComponent?: React.ReactElement
}

export default function PublicationFeed({
	publications,
	hasNextPage,
	fetchNextPage,
	onRefresh,
	isRefreshing,
	ListHeaderComponent,
}: Props) {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { sdk } = useSDK()
	const router = useRouter()

	const onEndReached = useCallback(() => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}, [hasNextPage, fetchNextPage])

	const { numColumns, paddingHorizontal } = useGridItemSize()

	const renderItem = useCallback(
		({ item: publication }: { item: OPDSPublication }) => {
			const thumbnailURL = getPublicationThumbnailURL(publication, sdk.rootURL)
			const selfURL = publication.links?.find((link) => hasLinkRel(link, 'self'))?.href

			if (!thumbnailURL) return null

			return (
				<View className="w-full items-center">
					<GridImageItem
						uri={thumbnailURL}
						title={publication.metadata.title}
						onPress={() =>
							router.navigate({
								pathname: '/opds/[id]/publication',
								params: {
									id: serverID,
									url: selfURL ? resolveUrl(selfURL, sdk.rootURL) : undefined,
								},
							})
						}
					/>
				</View>
			)
		},
		[serverID, sdk.rootURL, router],
	)

	if (!publications.length) return null

	return (
		<SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
			<FlashList
				key={`publications-feed-has-header?-${Boolean(ListHeaderComponent)}`}
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
