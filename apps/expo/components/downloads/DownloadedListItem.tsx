import { useRouter } from 'expo-router'
import { Pressable, View } from 'react-native'

import { DownloadedFile } from '~/db'
import { useListItemSize } from '~/lib/hooks'

import { BorderAndShadow } from '../BorderAndShadow'
import { TurboImage } from '../Image'
import { Text } from '../ui'
import { getThumbnailPath } from './utils'

type Props = {
	book: DownloadedFile
}

export default function DownloadedListItem({ book }: Props) {
	const router = useRouter()

	const thumbnailPath = getThumbnailPath(book)

	const { width, height } = useListItemSize()

	return (
		<Pressable onPress={() => router.navigate(`/offline/${book.id}/read`)}>
			{({ pressed }) => (
				<View className="relative" style={{ opacity: pressed ? 0.8 : 1 }}>
					<BorderAndShadow
						style={{ borderRadius: 8, borderWidth: 0.3, shadowRadius: 1.41, elevation: 2 }}
					>
						<TurboImage
							source={{
								// @ts-expect-error: URI doesn't like undefined but it shows a placeholder when
								// undefined so it's fine
								uri: thumbnailPath,
							}}
							resizeMode="stretch"
							resize={width * 1.5}
							style={{ height, width }}
						/>
					</BorderAndShadow>

					<View>
						<Text className="mt-2" style={{ maxWidth: width - 4 }} numberOfLines={2}>
							{book.bookName}
						</Text>
					</View>
				</View>
			)}
		</Pressable>
	)
}
