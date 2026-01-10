import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { Pressable, View } from 'react-native'

import { DownloadedFile, imageMeta } from '~/db'
import { useListItemSize } from '~/lib/hooks'

import { ThumbnailImage } from '../image'
import { Text } from '../ui'
import { getThumbnailPath } from './utils'

type Props = {
	book: DownloadedFile
}

export default function DownloadedListItem({ book }: Props) {
	const router = useRouter()

	const thumbnailData = useMemo(
		() => imageMeta.safeParse(book.thumbnailMeta).data,
		[book.thumbnailMeta],
	)

	const { width, height } = useListItemSize()

	return (
		<Pressable onPress={() => router.navigate(`/offline/${book.id}/read`)}>
			{({ pressed }) => (
				<View className="relative" style={{ opacity: pressed ? 0.8 : 1 }}>
					<ThumbnailImage
						source={{
							// @ts-expect-error: URI doesn't like undefined but it shows a placeholder when
							// undefined so it's fine
							uri: getThumbnailPath(book),
						}}
						resizeMode="stretch"
						size={{ height, width }}
						placeholderData={thumbnailData}
					/>

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
