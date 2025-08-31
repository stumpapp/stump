import { useSDK } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { useRouter } from 'expo-router'
import { View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'

import { useDisplay } from '~/lib/hooks'

import { useActiveServer } from '../activeServer'
import { FasterImage } from '../Image'
import { Text } from '../ui'

const fragment = graphql(`
	fragment LibrarySearchItem on Library {
		id
		name
		thumbnail {
			url
		}
	}
`)

export type ILibrarySearchItemFragment = FragmentType<typeof fragment>

type Props = {
	/**
	 * The query which was used that this library matches with. It will attempt to highlight
	 * the matching text in the title and/or description
	 */
	search?: string
	/**
	 * The library to display
	 */
	library: FragmentType<typeof fragment>
}

export default function LibrarySearchItem({ library }: Props) {
	const { sdk } = useSDK()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { width } = useDisplay()
	const data = useFragment(fragment, library)
	const router = useRouter()

	return (
		<Pressable
			onPress={() => router.navigate(`/server/${serverID}/libraries/${data.id}`)}
			style={{
				width: width * 0.75,
			}}
		>
			<View className="flex-row items-start gap-4 py-4">
				<FasterImage
					source={{
						url: data.thumbnail.url,
						headers: {
							Authorization: sdk.authorizationHeader || '',
						},
						resizeMode: 'fill',
						borderRadius: 8,
					}}
					style={{ width: 75, height: 75 / (2 / 3) }}
				/>

				<View className="flex-1">
					<Text>{data.name}</Text>
				</View>
			</View>
		</Pressable>
	)
}
