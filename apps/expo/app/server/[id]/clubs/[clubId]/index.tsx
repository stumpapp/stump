import { Host, Image } from '@expo/ui/swift-ui'
import { useRefetch, useSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { Settings } from 'lucide-react-native'
import { useLayoutEffect } from 'react'
import { Platform, Pressable, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useActiveServer } from '~/components/activeServer'
import { CurrentBookCard, Moderators, PastDiscussionsLink } from '~/components/bookClub'
import { DiscussionListItem } from '~/components/bookClub/discussion'
import RefreshControl from '~/components/RefreshControl'
import { Badge, Card, Icon, Text } from '~/components/ui'

const query = graphql(`
	query BookClubDetailScreen($id: ID!) {
		bookClubById(id: $id) {
			id
			name
			emoji
			membership {
				id
				role
			}
			moderators {
				id
				avatarUrl
				displayName
			}
			pinnedDiscussions {
				id
				...DiscussionListItem
			}
			currentBook {
				id
				...CurrentBookCard
				discussions {
					id
					...DiscussionListItem
				}
			}
			...PastDiscussionsLink
		}
	}
`)

export default function Screen() {
	const { clubId } = useLocalSearchParams<{ clubId: string }>()
	const router = useRouter()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	const { data, refetch } = useSuspenseGraphQL(query, ['bookClubById', clubId], {
		id: clubId,
	})
	const [isRefreshing, handleRefresh] = useRefetch(refetch)

	const club = data.bookClubById
	const isAdmin = club.membership?.role === 'ADMIN' || club.membership?.role === 'CREATOR'

	const navigation = useNavigation()
	useLayoutEffect(() => {
		navigation.setOptions({
			headerShown: true,
			title: club.name,
			headerRight: isAdmin
				? () => (
						<Pressable onPress={() => router.push(`/server/${serverID}/clubs/${clubId}/settings`)}>
							{SettingsIcon}
						</Pressable>
					)
				: undefined,
		})
	}, [navigation, club.name, isAdmin, router, serverID, clubId])

	// TODO(book-club): Add top-right action to Pinned Rooms card for adding a new one
	// This would require some cahnges to the Card comp
	return (
		<SafeAreaView edges={['bottom']} className="flex-1 bg-background">
			<ScrollView
				refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
				className="flex-1"
				contentInsetAdjustmentBehavior="always"
			>
				<View className="gap-6 px-4 py-4">
					{club.moderators.length > 0 && (
						<View className="flex flex-row items-center justify-between gap-2">
							<Badge>
								<Text>Moderated by</Text>
							</Badge>

							<Moderators moderators={club.moderators} />
						</View>
					)}

					{club.pinnedDiscussions.length > 0 && (
						<Card label="Pinned Rooms">
							{club.pinnedDiscussions.map((discussion) => (
								<Card.Row key={discussion.id}>
									<DiscussionListItem data={discussion} />
								</Card.Row>
							))}
						</Card>
					)}

					<View className="flex-row gap-3">
						<CurrentBookCard data={club.currentBook} />
						<PastDiscussionsLink data={club} />
					</View>

					<Card
						label="Active Discussions"
						listEmptyStyle={{
							message: 'No active discussions right now',
						}}
					>
						{club.currentBook?.discussions.map((discussion) => (
							<Card.Row key={discussion.id}>
								<DiscussionListItem data={discussion} />
							</Card.Row>
						))}
					</Card>
				</View>
			</ScrollView>
		</SafeAreaView>
	)
}

const SettingsIcon = Platform.select({
	ios: (
		<Host matchContents>
			<Image systemName="gear" />
		</Host>
	),
	android: <Icon as={Settings} className="shadow" />,
})
