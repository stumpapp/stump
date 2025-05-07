import { useSDK } from '@stump/client'
import { Media } from '@stump/sdk'
import { View } from 'react-native'

import { FasterImage } from '../Image'
import { Text } from '../ui'

type Props = {
	/**
	 * The query which was used that this book matches with. It will attempt to highlight
	 * the matching text in the title and/or description
	 */
	search?: string
	/**
	 * The book to display
	 */
	book: Media
}

export default function BookSearchItem({ search, book }: Props) {
	const { sdk } = useSDK()

	return (
		<View className="flex-row items-start gap-4 py-4">
			<FasterImage
				source={{
					url: sdk.media.thumbnailURL(book.id),
					headers: {
						Authorization: sdk.authorizationHeader || '',
					},
					resizeMode: 'fill',
					borderRadius: 5,
				}}
				style={{ width: 50, height: 50 / (2 / 3) }}
			/>

			<View className="flex-1">
				<Text>{book.name}</Text>
			</View>
		</View>
	)
}
