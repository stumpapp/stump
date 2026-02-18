import { Host, Image } from '@expo/ui/swift-ui'
import { FlashList } from '@shopify/flash-list'
import { useRefetch, useSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { Link, useNavigation } from 'expo-router'
import { Inbox } from 'lucide-react-native'
import { useEffect } from 'react'
import { Platform, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useActiveServer } from '~/components/activeServer'
import { BookClubCard } from '~/components/bookClub'
import ListEmpty from '~/components/ListEmpty'
import RefreshControl from '~/components/RefreshControl'
import { Icon } from '~/components/ui'

const query = graphql(`
	query BookClubsScreen {
		bookClubs {
			id
			...BookClubCard
		}
		myBookClubInvitations {
			id
		}
	}
`)

export default function Screen() {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	const { data, refetch } = useSuspenseGraphQL(query, ['bookClubs', serverID])

	const clubs = data?.bookClubs || []
	const pendingInvitesCount = data?.myBookClubInvitations?.length || 0

	const [isRefetching, handleRefetch] = useRefetch(refetch)

	const navigation = useNavigation()
	useEffect(() => {
		if (pendingInvitesCount > 0) {
			navigation.setOptions({
				headerLeft: () => <Link href={`/server/${serverID}/clubs/invites`}>{InvitationsIcon}</Link>,
			})
		}
	}, [navigation, serverID, pendingInvitesCount])

	return (
		<SafeAreaView
			style={{ flex: 1 }}
			className="bg-background"
			edges={Platform.OS === 'android' ? [] : []}
		>
			<FlashList
				data={clubs}
				renderItem={({ item }) => <BookClubCard club={item} />}
				keyExtractor={(item) => item.id}
				contentContainerStyle={{ padding: 16 }}
				contentInsetAdjustmentBehavior="always"
				ItemSeparatorComponent={() => <View className="h-3" />}
				ListEmptyComponent={
					<ListEmpty
						title="No clubs yet"
						message="Join a club or create your own to get started with book clubs."
					/>
				}
				refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefetch} />}
			/>
		</SafeAreaView>
	)
}

const InvitationsIcon = Platform.select({
	ios: (
		<Host matchContents>
			<Image systemName="tray.badge.fill" />
		</Host>
	),
	android: <Icon as={Inbox} className="shadow" />,
})
