import { FlashList } from '@shopify/flash-list'
import { useDirectoryListing } from '@stump/client'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import { useCallback, useEffect } from 'react'
import { Platform, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { FileExplorerGridItem } from '~/components/fileExplorer'
import { Heading, Text } from '~/components/ui'
import { ON_END_REACHED_THRESHOLD } from '~/lib/constants'

export default function Screen() {
	const params = useLocalSearchParams<{
		path: string
		friendlyName?: string
	}>()
	const rootPath = params.path
	const friendlyName = params.friendlyName

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
		errorMessage,
	} = useDirectoryListing({
		enforcedRoot: rootPath,
		initialPath: rootPath,
	})

	const renderItem = useCallback(({ item }: { item: (typeof entries)[0] }) => {
		return <FileExplorerGridItem file={item} />
	}, [])

	const render = () => {
		if (errorMessage) {
			return (
				<View className="flex-1 items-center justify-center px-4">
					<Heading size="lg" className="text-center">
						Something went wrong
					</Heading>
					<Text className="text-muted-foreground text-center text-base">{errorMessage}</Text>
				</View>
			)
		} else {
			return (
				<FlashList
					data={entries}
					numColumns={3}
					renderItem={renderItem}
					contentInsetAdjustmentBehavior="automatic"
					onEndReachedThreshold={ON_END_REACHED_THRESHOLD}
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
			)
		}
	}

	return (
		<SafeAreaView
			style={{ flex: 1 }}
			edges={['left', 'right', ...(Platform.OS === 'ios' ? [] : ['bottom' as const])]}
		>
			{render()}
		</SafeAreaView>
	)
}
