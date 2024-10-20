import { useSDK } from '@stump/client'
import { Media } from '@stump/sdk'

import { TouchableOpacity } from 'react-native'

import EntityImage from '../EntityImage'
import { Text, View } from '../primitives'

export const BOOK_LIST_ITEM_HEIGHT = 75

type BookListItemProps = {
	book: Media
	navigate: (id: string) => void
}
export const BookListItem = React.memo(({ book, navigate }: BookListItemProps) => {
	const { sdk } = useSDK()

	return (
		<TouchableOpacity
			key={book.id}
			className="w-full flex-row items-center space-x-3 px-4"
			style={{ height: BOOK_LIST_ITEM_HEIGHT, minHeight: BOOK_LIST_ITEM_HEIGHT }}
			onPress={() => navigate(book.id)}
		>
			<EntityImage
				url={sdk.media.thumbnailURL(book.id)}
				style={{ height: 50, objectFit: 'scale-down', width: 50 / (3 / 2) }}
			/>
			<View className="flex-1">
				<Text size="sm">{book.metadata?.title || book.name}</Text>
			</View>
		</TouchableOpacity>
	)
})
BookListItem.displayName = 'BookListItem'
