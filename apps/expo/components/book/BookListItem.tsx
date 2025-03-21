import { useSDK } from '@stump/client'
import { Media } from '@stump/sdk'
import { useRouter } from 'expo-router'
import { memo } from 'react'
import { View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'

import { useDisplay, useListItemSize } from '~/lib/hooks'
import { cn } from '~/lib/utils'

import { useActiveServer } from '../activeServer'
import { FasterImage } from '../Image'
import { Text } from '../ui'

type Props = {
	book: Media
}

function BookListItem({ book }: Props) {
	const { sdk } = useSDK()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { isTablet } = useDisplay()

	const router = useRouter()

	const { width } = useListItemSize()

	return (
		<Pressable onPress={() => router.navigate(`/server/${serverID}/books/${book.id}`)}>
			{({ pressed }) => (
				<View
					className={cn('flex items-start px-1 tablet:px-2', {
						'opacity-90': pressed,
					})}
				>
					<View className="relative overflow-hidden rounded-lg">
						<FasterImage
							source={{
								url: sdk.media.thumbnailURL(book.id),
								headers: {
									Authorization: sdk.authorizationHeader || '',
								},
								resizeMode: 'fill',
							}}
							style={{ height: isTablet ? 225 : 150, width: width }}
						/>
					</View>

					<View>
						<Text className="mt-2" style={{ maxWidth: width - 4 }} numberOfLines={2}>
							{book.metadata?.title || book.name}
						</Text>
					</View>
				</View>
			)}
		</Pressable>
	)
}

export default memo(BookListItem)
