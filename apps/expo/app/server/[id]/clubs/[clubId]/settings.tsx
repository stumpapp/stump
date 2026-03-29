import { useSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useLocalSearchParams } from 'expo-router'
import { ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Text } from '~/components/ui'

const query = graphql(`
	query BookClubSettings($id: ID!) {
		bookClubById(id: $id) {
			id
			name
			description
			isPrivate
			emoji
			membership {
				id
				role
			}
		}
	}
`)

const updateClubMutation = graphql(`
	mutation UpdateBookClubSettings($id: ID!, $input: UpdateBookClubInput!) {
		updateBookClub(id: $id, input: $input) {
			id
		}
	}
`)

const deleteClubMutation = graphql(`
	mutation DeleteBookClub($id: ID!) {
		deleteBookClub(id: $id) {
			id
		}
	}
`)

const leaveClubMutation = graphql(`
	mutation LeaveBookClub($id: ID!) {
		leaveBookClub(bookClubId: $id) {
			id
		}
	}
`)

export default function Screen() {
	const { clubId } = useLocalSearchParams<{ clubId: string }>()

	const { data } = useSuspenseGraphQL(query, ['bookClubById', clubId, 'settings'], {
		id: clubId,
	})

	const club = data.bookClubById

	return (
		<SafeAreaView className="flex-1 bg-background">
			<ScrollView className="flex-1 p-4">
				<Text>TODO: Make me</Text>
			</ScrollView>
		</SafeAreaView>
	)
}
