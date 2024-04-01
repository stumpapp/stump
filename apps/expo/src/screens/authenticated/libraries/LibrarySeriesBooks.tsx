import { type RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import { useMediaCursorQuery } from '@stump/client'
import React, { useCallback } from 'react'
import { FlatList } from 'react-native'

import { ScreenRootView, View } from '@/components'
import { BookListItem } from '@/components/book'

import { BookStackNavigation } from '../book/BookStackNavigator'
import { LibraryStackScreenParams } from './LibraryStackNavigator'

type Params = {
	params: LibraryStackScreenParams
}

export default function LibrarySeriesBookList() {
	const { navigate } = useNavigation<BookStackNavigation>()
	const {
		params: { id },
	} = useRoute<RouteProp<Params>>()

	const handleNavigate = useCallback(
		(id: string) =>
			navigate('BookStack', {
				params: { id: id },
				screen: 'BookOverview',
			}),
		[navigate],
	)

	if (!id) {
		throw new Error('ID required for this Screen!')
	}

	const {
		media: books,
		hasNextPage,
		fetchNextPage,
	} = useMediaCursorQuery({
		params: {
			series: {
				id,
			},
		},
	})

	const handleFetchMore = useCallback(() => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}, [hasNextPage, fetchNextPage])

	return (
		<ScreenRootView>
			<FlatList
				className="w-full"
				data={books}
				renderItem={({ item }) => (
					<BookListItem key={item.id} book={item} navigate={handleNavigate} />
				)}
				keyExtractor={(item) => item.id}
				ItemSeparatorComponent={() => <View className="h-px bg-gray-50 dark:bg-gray-900" />}
				onEndReachedThreshold={0.85}
				onEndReached={handleFetchMore}
			/>
		</ScreenRootView>
	)
}
