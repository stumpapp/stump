import { useLibraries, useSDK } from '@stump/client'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { Pressable, SafeAreaView, useWindowDimensions, View } from 'react-native'
import { FlatGrid } from 'react-native-super-grid'

import { useActiveServer } from '~/components/activeServer'
import RefreshControl from '~/components/RefreshControl'
import { Heading, Text } from '~/components/ui'
import { cn } from '~/lib/utils'

export default function Screen() {
	const { width } = useWindowDimensions()
	const { sdk } = useSDK()
	const { libraries, refetch, isRefetching } = useLibraries({ suspense: true })
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const router = useRouter()

	// iPad or other large screens can have more columns (i.e., smaller itemDimension) but most phones should have 2 columns
	const isTablet = useMemo(() => width > 768, [width])
	const itemDimension = useMemo(
		() =>
			width /
				// 2 columns on phones
				(isTablet ? 4 : 2) -
			16 * 2,
		[isTablet, width],
	)

	return (
		<SafeAreaView className="flex-1 bg-background">
			<FlatGrid
				ListHeaderComponent={() => (
					<Heading size="xl" className="px-4 pb-4 font-semibold">
						All libraries
					</Heading>
				)}
				refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
				itemDimension={itemDimension}
				data={libraries || []}
				renderItem={({ item: { id, name } }) => (
					<Pressable onPress={() => router.navigate(`/server/${serverID}/libraries/${id}`)}>
						{({ pressed }) => (
							<View className="flex items-start gap-4">
								<View
									className={cn('aspect-[2/3] overflow-hidden rounded-lg', {
										'opacity-80': pressed,
									})}
								>
									<Image
										source={{
											uri: sdk.library.thumbnailURL(id),
											headers: {
												Authorization: sdk.authorizationHeader,
											},
										}}
										contentFit="fill"
										style={{ height: itemDimension * 1.5, width: itemDimension }}
									/>
								</View>

								<Text className="text-xl font-medium leading-6">{name}</Text>
							</View>
						)}
					</Pressable>
				)}
			/>
		</SafeAreaView>
	)
}
