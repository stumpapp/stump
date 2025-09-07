import { FlashList } from '@shopify/flash-list'
import { useSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { Platform, View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useActiveServer } from '~/components/activeServer'
import { Text } from '~/components/ui'

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

	// const {} = useGridItemSize // TODO: Port for files grid bc different

	const router = useRouter()

	return (
		<SafeAreaView
			style={{ flex: 1 }}
			edges={Platform.OS === 'ios' ? ['top', 'left', 'right'] : ['left', 'right']}
		>
			<FlashList
				data={libraries}
				numColumns={3}
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
								<Image
									// eslint-disable-next-line @typescript-eslint/no-require-imports
									source={require('../../../../assets/icons/Folder.png')}
									style={{ width: 100, height: 100 }}
								/>
								<View>
									<Text className="text-lg font-medium">{item.name}</Text>
								</View>
							</View>
						)}
					</Pressable>
				)}
				contentInsetAdjustmentBehavior="automatic"
			/>
		</SafeAreaView>
	)
}
