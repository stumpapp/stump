import {
	useLibraryByID,
	useLibrarySeriesCursorQuery,
	useSDK,
	useSeriesCursorQuery,
} from '@stump/client'
import { Image } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useMemo } from 'react'
import { Pressable, SafeAreaView, useWindowDimensions, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { FlatGrid } from 'react-native-super-grid'
import { useActiveServer } from '~/components/activeServer'
import RefreshControl from '~/components/RefreshControl'
import { Heading, Text } from '~/components/ui'
import { cn } from '~/lib/utils'

export default function Screen() {
	const { id } = useLocalSearchParams<{ id: string }>()
	const { width } = useWindowDimensions()
	const { sdk } = useSDK()

	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { library } = useLibraryByID(id, { suspense: true })
	const { series, hasNextPage, fetchNextPage, refetch, isRefetching } = useLibrarySeriesCursorQuery(
		{
			id,
			suspense: true,
		},
	)
	const router = useRouter()

	const onEndReached = useCallback(() => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}, [hasNextPage, fetchNextPage])

	// iPad or other large screens can have more columns (i.e., smaller itemDimension) but most phones should have 2 columns
	const isTablet = useMemo(() => width > 768, [width])
	const itemDimension = useMemo(
		() =>
			width /
				// 2 columns on phones
				(isTablet ? 4 : 2) -
			16 * 2,
		[isTablet],
	)

	if (!library) return null

	return (
		<SafeAreaView className="flex-1 bg-background">
			<FlatGrid
				ListHeaderComponent={() => (
					<Heading size="xl" className="px-4 pb-4 font-semibold">
						{library.name}
					</Heading>
				)}
				refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
				itemDimension={itemDimension}
				data={series || []}
				renderItem={({ item: { id, name, metadata } }) => (
					<Pressable onPress={() => router.navigate(`/server/${serverID}/series/${id}`)}>
						{({ pressed }) => (
							<View className="flex items-start justify-start gap-4">
								<View
									className={cn('aspect-[2/3] overflow-hidden rounded-lg', {
										'opacity-80': pressed,
									})}
								>
									<Image
										source={{
											uri: sdk.series.thumbnailURL(id),
											headers: {
												Authorization: sdk.authorizationHeader,
											},
										}}
										contentFit="fill"
										style={{ height: itemDimension * 1.5, width: itemDimension }}
									/>
								</View>

								<Text className="line-clamp-1 text-xl font-medium leading-6">
									{metadata?.title || name}
								</Text>
							</View>
						)}
					</Pressable>
				)}
				onEndReachedThreshold={0.85}
				onEndReached={onEndReached}
			/>
		</SafeAreaView>
	)
}
