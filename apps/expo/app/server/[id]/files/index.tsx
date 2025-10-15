/* eslint-disable @typescript-eslint/no-require-imports */
import { FlashList } from '@shopify/flash-list'
import { useSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useRouter } from 'expo-router'
import { Image, Platform, Pressable, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useActiveServer } from '~/components/activeServer'
import { TurboImage } from '~/components/Image'
import { Text } from '~/components/ui'
import { useDisplay } from '~/lib/hooks'
import { useColorScheme } from '~/lib/useColorScheme'

const query = graphql(`
	query LibraryPaths {
		libraries(pagination: { none: { unpaginated: true } }) {
			nodes {
				id
				name
				path
			}
		}
	}
`)

export default function Screen() {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const {
		data: {
			libraries: { nodes: libraries },
		},
	} = useSuspenseGraphQL(query, ['libraryPaths'])
	const { colorScheme } = useColorScheme()

	const { isTablet, isLandscapeTablet } = useDisplay()
	// const {} = useGridItemSize // TODO: Port for files grid bc different

	const cols = isTablet ? (isLandscapeTablet ? 5 : 4) : 3

	const router = useRouter()

	return (
		<SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
			<FlashList
				data={libraries}
				numColumns={cols}
				renderItem={({ item }) => (
					<Pressable
						onPress={() =>
							router.push({
								// @ts-expect-error: String path
								pathname: `/server/[id]/files/[path]?friendlyName=${item.name}`,
								params: {
									id: serverID,
									path: item.path,
								},
							})
						}
					>
						{({ pressed }) => (
							<View className="items-center" style={{ opacity: pressed ? 0.75 : 1 }}>
								<TurboImage
									source={{
										uri: Image.resolveAssetSource(
											colorScheme === 'dark'
												? require('../../../../assets/icons/Folder.png')
												: require('../../../../assets/icons/Folder_Light.png'),
										).uri,
									}}
									resize={100 * 1.5}
									style={{ width: 100, height: 100 }}
								/>
								<View>
									<Text className="text-lg font-medium">{item.name}</Text>
								</View>
							</View>
						)}
					</Pressable>
				)}
				contentInsetAdjustmentBehavior="always"
				contentContainerStyle={{ padding: 8 }}
			/>
		</SafeAreaView>
	)
}
