import { useLibraries, useSDK } from '@stump/client'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { Pressable, SafeAreaView, useWindowDimensions, View } from 'react-native'
import { FlatGrid } from 'react-native-super-grid'

import { useActiveServer } from '~/components/activeServer'
import { Text } from '~/components/ui'
import { cn } from '~/lib/utils'

export default function Screen() {
	const { width } = useWindowDimensions()
	const { sdk } = useSDK()
	const { libraries } = useLibraries({ suspense: true })
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
			<View className="flex-1 gap-5 p-4">
				<Text className="text-3xl font-semibold">All libraries</Text>

				<FlatGrid
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
			</View>
		</SafeAreaView>
	)
}
