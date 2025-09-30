import { useSDK } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { useRouter } from 'expo-router'
import { memo } from 'react'
import { Pressable, View } from 'react-native'

import { useListItemSize } from '~/lib/hooks'

import { useActiveServer } from '../activeServer'
import { BorderAndShadow } from '../BorderAndShadow'
import { TurboImage } from '../Image'
import { Text } from '../ui'

const fragment = graphql(`
	fragment BookListItem on Media {
		id
		resolvedName
		thumbnail {
			url
		}
	}
`)

export type BookListItemFragmentType = FragmentType<typeof fragment>

type Props = {
	book: BookListItemFragmentType
}

function BookListItem({ book }: Props) {
	const data = useFragment(fragment, book)

	const { sdk } = useSDK()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	const router = useRouter()

	const { width, height } = useListItemSize()

	return (
		<Pressable onPress={() => router.navigate(`/server/${serverID}/books/${data.id}`)}>
			{({ pressed }) => (
				<View className="relative" style={{ opacity: pressed ? 0.8 : 1 }}>
					<BorderAndShadow
						style={{ borderRadius: 8, borderWidth: 0.3, shadowRadius: 1.41, elevation: 2 }}
					>
						<TurboImage
							source={{
								uri: data.thumbnail.url,
								headers: {
									...sdk.customHeaders,
									Authorization: sdk.authorizationHeader || '',
								},
							}}
							resizeMode="stretch"
							resize={width * 1.5}
							style={{ height, width }}
						/>
					</BorderAndShadow>

					<View>
						<Text className="mt-2" style={{ maxWidth: width - 4 }} numberOfLines={2}>
							{data.resolvedName}
						</Text>
					</View>
				</View>
			)}
		</Pressable>
	)
}

export default memo(BookListItem)
