import { useSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import { useEffect } from 'react'
import { View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useActiveServer } from '~/components/activeServer'
import { DiscussionListItem } from '~/components/bookClub/discussion'
import ListEmpty from '~/components/ListEmpty'
import { Card } from '~/components/ui'

const query = graphql(`
	query BookClubPastBookScreen($bookId: ID!) {
		bookClubDiscussionByBook(bookClubBookId: $bookId) {
			id
			...DiscussionListItem
		}
		bookClubBook(id: $bookId) {
			title
			entity {
				resolvedName
			}
		}
	}
`)

export default function Screen() {
	const { bookId } = useLocalSearchParams<{ bookId: string }>()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	const {
		data: { bookClubDiscussionByBook: discussions, bookClubBook: book },
	} = useSuspenseGraphQL(query, ['bookClubDiscussionByBook', bookId, serverID], {
		bookId,
	})

	const bookName = book?.entity?.resolvedName ?? book?.title
	const navigation = useNavigation()
	useEffect(() => {
		if (!bookName) return
		navigation.setOptions({
			title: `${bookName} - Archive`,
		})
	}, [bookName, navigation])

	// TODO(book-club): FlashList most likely
	return (
		<SafeAreaView edges={['bottom']} className="flex-1 bg-background">
			<ScrollView className="flex-1" contentInsetAdjustmentBehavior="always">
				<View className="gap-6 px-4 py-4">
					{discussions.length > 0 && (
						<Card label="Discussions">
							{discussions.map((discussion) => (
								<Card.Row key={discussion.id}>
									<DiscussionListItem data={discussion} />
								</Card.Row>
							))}
						</Card>
					)}
					{discussions.length === 0 && <ListEmpty message="No discussions for this book" />}
				</View>
			</ScrollView>
		</SafeAreaView>
	)
}
