import { Host, Image } from '@expo/ui/swift-ui'
import { FlashList } from '@shopify/flash-list'
import { useRefetch, useSuspenseGraphQL } from '@stump/client'
import { graphql, UserPermission } from '@stump/graphql'
import { useRouter } from 'expo-router'
import { Link, Stack, useNavigation } from 'expo-router'
import { Inbox } from 'lucide-react-native'
import { useEffect } from 'react'
import { Platform, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useActiveServer, useStumpServer } from '~/components/activeServer'
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
	const { checkPermission } = useStumpServer()

	const { data, refetch } = useSuspenseGraphQL(query, ['bookClubs', serverID])

	const clubs = data?.bookClubs || []
	const pendingInvitesCount = data?.myBookClubInvitations?.length || 0
	const canCreateClubs = checkPermission(UserPermission.CreateBookClub)

	const [isRefetching, handleRefetch] = useRefetch(refetch)

	const navigation = useNavigation()
	useEffect(() => {
		if (pendingInvitesCount > 0 && Platform.OS === 'android') {
			navigation.setOptions({
				headerLeft: () => <Link href={`/server/${serverID}/clubs/invites`}>{InvitationsIcon}</Link>,
			})
		}
	}, [navigation, serverID, pendingInvitesCount])

	const router = useRouter()

	return (
		<>
			{pendingInvitesCount > 0 && Platform.OS === 'ios' && (
				<Stack.Toolbar placement="left">
					<Stack.Toolbar.Button
						onPress={() => router.navigate(`/server/${serverID}/clubs/invites`)}
						icon="tray.badge.fill"
					>
						<Stack.Toolbar.Badge>{String(pendingInvitesCount)}</Stack.Toolbar.Badge>
					</Stack.Toolbar.Button>
				</Stack.Toolbar>
			)}

			{canCreateClubs && Platform.OS === 'ios' && (
				<Stack.Toolbar placement="right">
					<Stack.Toolbar.Button
						onPress={() => router.navigate(`/server/${serverID}/clubs/create`)}
						icon="plus"
					/>
				</Stack.Toolbar>
			)}

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
		</>
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
