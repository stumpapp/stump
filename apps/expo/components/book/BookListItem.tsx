import { useSDK } from '@stump/client'
import { Media } from '@stump/sdk'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'

import { useDisplay } from '~/lib/hooks'
import { cn } from '~/lib/utils'

import { useActiveServer } from '../activeServer'
import { Text } from '../ui'

type Props = {
	book: Media
}

export default function BookListItem({ book }: Props) {
	const { sdk } = useSDK()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { isTablet } = useDisplay()
	const router = useRouter()

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
							style={{ height: isTablet ? 200 : 150, width: 'auto' }}
						/>
					</View>

					<View>
						<Text
							className="mt-2 line-clamp-2 text-sm tablet:text-sm"
							style={{ maxWidth: 150 * 0.75 }}
						>
							{book.metadata?.title || book.name}
						</Text>
					</View>
				</View>
			)}
		</Pressable>
	)
}
