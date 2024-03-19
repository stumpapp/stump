import { useNavigation } from '@react-navigation/native'
import { useMediaCursorQuery } from '@stump/client'
import React, { useCallback } from 'react'
import { FlatList } from 'react-native'

import { ScreenRootView, View } from '@/components'
import { BOOK_LIST_ITEM_HEIGHT, BookListItem } from '@/components/book'

import { BookStackNavigation } from '../book/BookStackNavigator'

const SEPARATOR_HEIGHT = 1

export default function Explore() {
	const { navigate } = useNavigation<BookStackNavigation>()
	const { media: books, hasNextPage, fetchNextPage } = useMediaCursorQuery({})

	const handleFetchMore = useCallback(() => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}, [hasNextPage, fetchNextPage])

	const handleNavigate = useCallback(
		(id: string) =>
			navigate('BookStack', {
				params: { id: id },
				screen: 'BookOverview',
			}),
		[navigate],
	)

	const windowSize = books.length > 50 ? books.length / 4 : 21

	return (
		<ScreenRootView disabledBottomInset>
			<FlatList
				className="w-full"
				data={books}
				renderItem={({ item }) => (
					<BookListItem book={item} key={item.id} navigate={handleNavigate} />
				)}
				getItemLayout={(_, index) => ({
					index,
					length: BOOK_LIST_ITEM_HEIGHT,
					offset: BOOK_LIST_ITEM_HEIGHT * index + SEPARATOR_HEIGHT,
				})}
				ItemSeparatorComponent={() => (
					<View
						className="bg-gray-50 dark:bg-gray-900"
						style={{
							height: SEPARATOR_HEIGHT,
						}}
					/>
				)}
				keyExtractor={(item) => item.id}
				onEndReachedThreshold={0.85}
				onEndReached={handleFetchMore}
				maxToRenderPerBatch={windowSize}
				windowSize={windowSize}
			/>
		</ScreenRootView>
	)
}
