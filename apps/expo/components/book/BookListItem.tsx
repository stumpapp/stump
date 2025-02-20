import { useSDK } from '@stump/client'
import { Media } from '@stump/sdk'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'

import { useDisplay } from '~/lib/hooks'
import { cn } from '~/lib/utils'

import { useActiveServer } from '../activeServer'
import { Text } from '../ui'

type Props = {
	book: Media
}

// TODO: create separate BookGridItem vs BookHorizontalListItem
export default function BookListItem({ book }: Props) {
	const { sdk } = useSDK()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { isTablet } = useDisplay()

	const router = useRouter()

	const itemHeight = useMemo(() => (isTablet ? 225 : 150), [isTablet])
	const itemWidth = useMemo(() => itemHeight * (2 / 3), [itemHeight])

	return (
		<Pressable onPress={() => router.navigate(`/server/${serverID}/books/${book.id}`)}>
			{({ pressed }) => (
				<View
					className={cn('flex items-start px-1 tablet:px-2', {
						'opacity-90': pressed,
					})}
				>
					<View className="relative aspect-[2/3] overflow-hidden rounded-lg">
						<Image
							className="z-0"
							source={{
								uri: sdk.media.thumbnailURL(book.id),
								headers: {
									Authorization: sdk.authorizationHeader,
								},
							}}
							contentFit="fill"
							style={{ height: isTablet ? 225 : 150, width: itemWidth }}
						/>
					</View>

					<View>
						<Text className="mt-2" style={{ maxWidth: itemWidth - 4 }} numberOfLines={2}>
							{book.metadata?.title || book.name}
						</Text>
					</View>
				</View>
			)}
		</Pressable>
	)
}
