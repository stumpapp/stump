import { useSDK } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { useRouter } from 'expo-router'
import { View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'

import { useDisplay } from '~/lib/hooks'

import { useActiveServer } from '../activeServer'
import { TurboImage } from '../Image'
import { Text } from '../ui'
import { BorderAndShadow } from '../BorderAndShadow'

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
			<View className="flex-row items-start gap-4 p-4">
				<BorderAndShadow
					style={{ borderRadius: 4, borderWidth: 0.3, shadowRadius: 1.41, elevation: 2 }}
				>
					<TurboImage
						source={{
							uri: data.thumbnail.url,
							headers: {
								Authorization: sdk.authorizationHeader || '',
							},
						}}
						resizeMode="stretch"
						resize={75 * 1.5}
						style={{ width: 75, height: 75 / (2 / 3) }}
					/>
				</BorderAndShadow>

				<View className="flex-1">
					<Text>{data.name}</Text>
				</View>
			</View>
		</Pressable>
	)
}
