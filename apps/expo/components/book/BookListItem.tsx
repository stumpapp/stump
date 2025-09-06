import { useSDK } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { useRouter } from 'expo-router'
import { memo } from 'react'
import { View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'

import { useListItemSize } from '~/lib/hooks'
import { cn } from '~/lib/utils'

import { useActiveServer } from '../activeServer'
import { FasterImage } from '../Image'
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
				<View
					className={cn('flex items-start px-1 tablet:px-2', {
						'opacity-90': pressed,
					})}
				>
					<View className="relative overflow-hidden rounded-lg">
						<FasterImage
							source={{
								url: data.thumbnail.url,
								headers: {
									Authorization: sdk.authorizationHeader || '',
								},
								resizeMode: 'fill',
							}}
							style={{ height, width }}
						/>
					</View>

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
