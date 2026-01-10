import { useSDK } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { useRouter } from 'expo-router'
import { memo } from 'react'
import { Pressable, View } from 'react-native'

import { useListItemSize } from '~/lib/hooks'

import { useActiveServer } from '../activeServer'
import { ThumbnailImage } from '../image'
import { Text } from '../ui'

const fragment = graphql(`
	fragment BookListItem on Media {
		id
		resolvedName
		thumbnail {
			url
			metadata {
				averageColor
				colors {
					color
					percentage
				}
				thumbhash
			}
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
	const { url: uri, metadata: placeholderData } = data.thumbnail

	return (
		<Pressable onPress={() => router.navigate(`/server/${serverID}/books/${data.id}`)}>
			{({ pressed }) => (
				<View className="relative" style={{ opacity: pressed ? 0.8 : 1 }}>
					<ThumbnailImage
						source={{
							uri,
							headers: {
								...sdk.customHeaders,
								Authorization: sdk.authorizationHeader || '',
							},
						}}
						resizeMode="stretch"
						size={{ height, width }}
						placeholderData={placeholderData}
					/>

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
