import { FlashList } from '@shopify/flash-list'
import { useDirectoryListing } from '@stump/client'
import { Image } from 'expo-image'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { useCallback, useEffect } from 'react'
import { Platform, View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useActiveServer } from '~/components/activeServer'
import { Text } from '~/components/ui'

export default function Screen() {
	const params = useLocalSearchParams<{
		path: string
		friendlyName?: string
		navigationKey?: string // Handle the navigation key
	}>()
	const rootPath = params.path
	const friendlyName = params.friendlyName

	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	const router = useRouter()

	const navigation = useNavigation()
	const basename = rootPath?.split('/').filter(Boolean).pop() ?? 'Files'
	useEffect(() => {
		navigation.setOptions({
			headerTitle: friendlyName || basename,
		})
	}, [friendlyName, basename, navigation])

	const {
		entries,
		// setPath,
		// path,
		// goForward,
		// goBack,
		// canGoBack,
		// canGoForward,
		// refetch,
		canLoadMore,
		loadMore,
	} = useDirectoryListing({
		enforcedRoot: rootPath,
		initialPath: rootPath,
	})

	const renderItem = useCallback(
		({ item }: { item: (typeof entries)[0] }) => {
			return (
				<Pressable
					onPress={() => {
						if (item.isDirectory) {
							router.push({
								pathname: `/server/[id]/files/[path]`,
								params: {
									id: serverID,
									path: item.path,
									friendlyName: item.name,
								},
							})
						}
					}}
				>
					{({ pressed }) => (
						<View className="items-center" style={{ opacity: pressed ? 0.75 : 1 }}>
							{item.isDirectory && (
								<Image
									// eslint-disable-next-line @typescript-eslint/no-require-imports
									source={require('../../../../assets/icons/Folder.png')}
									style={{ width: 100, height: 100 }}
								/>
							)}
							{!item.isDirectory && (
								<Image
									// eslint-disable-next-line @typescript-eslint/no-require-imports
									source={require('../../../../assets/icons/Document.png')}
									style={{ width: 100, height: 100 }}
								/>
							)}
							<View>
								<Text className="text-base font-medium" numberOfLines={1}>
									{item.name}
								</Text>
							</View>
						</View>
					)}
				</Pressable>
			)
		},
		[router, serverID],
	)

	return (
		<SafeAreaView
			style={{ flex: 1 }}
			edges={Platform.OS === 'ios' ? ['top', 'left', 'right'] : ['left', 'right']}
		>
			<FlashList
				data={entries}
				numColumns={3}
				renderItem={renderItem}
				contentInsetAdjustmentBehavior="automatic"
				onEndReachedThreshold={0.75}
				onEndReached={() => {
					if (canLoadMore) {
						loadMore()
					}
				}}
				contentContainerStyle={{
					padding: 8,
				}}
				ItemSeparatorComponent={() => <View className="h-4" />}
			/>
		</SafeAreaView>
	)
}
