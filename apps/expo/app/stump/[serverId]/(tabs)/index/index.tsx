import MoreHorizontal from '@expo/material-symbols/more_horiz.xml'
import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { useQueryClient } from '@tanstack/react-query'
import { Stack, useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { Platform, ScrollView, View } from 'react-native'

import { ContinueReading, OnDeck, RecentlyAddedBooks } from '~/components/activeServer/home'
import RecentlyAddedSeriesHorizontal from '~/components/activeServer/home/RecentlyAddedSeriesHorizontal'
import RefreshControl from '~/components/RefreshControl'
import { ServerSettingsSheet } from '~/components/savedServer/serverSettings/ServerSettingsSheet'
import { useActiveServer } from '~/providers/ActiveServerProvider'

export default function Screen() {
	const [refreshing, setRefreshing] = useState(false)

	const client = useQueryClient()
	const onRefresh = useCallback(
		async (isBackground = false) => {
			setRefreshing(!isBackground)
			await Promise.all([
				client.invalidateQueries({ queryKey: ['continueReading'], exact: false }),
				client.invalidateQueries({ queryKey: ['onDeck'], exact: false }),
				client.invalidateQueries({ queryKey: ['recentlyAddedBooks'], exact: false }),
				client.invalidateQueries({ queryKey: ['recentlyAddedSeries'], exact: false }),
			])
			setRefreshing(false)
		},
		[client],
	)

	// Always refresh when we come back to this screen
	useFocusEffect(
		useCallback(() => {
			onRefresh(true)
		}, [onRefresh]),
	)

	const { activeServer } = useActiveServer()

	// TODO: could not get this working :(
	// const { sdk } = useSDK()

	// const userAvatar = useUserStore((state) => state.user?.avatar)

	// const iconProps: StackToolbarIconProps = userAvatar
	// 	? {
	// 			src: {
	// 				uri: userAvatar.url,
	// 				width: 32,
	// 				height: 32,
	// 				headers: {
	// 					Authorization: sdk.authorizationHeader || '',
	// 				},
	// 			},
	// 		}
	// 	: {
	// 			sf: 'gearshape.fill',
	// 		}

	const router = useRouter()

	return (
		<>
			<Stack.Toolbar placement="right">
				{/*<Stack.Toolbar.Button>
					<Stack.Toolbar.Icon {...iconProps} />
				</Stack.Toolbar.Button>*/}

				<Stack.Toolbar.Menu icon={Platform.OS === 'ios' ? 'ellipsis' : MoreHorizontal}>
					<Stack.Toolbar.MenuAction
						icon="gearshape"
						onPress={() => TrueSheet.present('serverSettingsSheet')}
					>
						Settings
					</Stack.Toolbar.MenuAction>

					<Stack.Toolbar.Menu inline>
						<Stack.Toolbar.MenuAction
							icon="arrow.left.to.line"
							// icon={require('./assets/reply.png')}
							onPress={() => router.back()}
						>
							Exit
						</Stack.Toolbar.MenuAction>
					</Stack.Toolbar.Menu>
				</Stack.Toolbar.Menu>
			</Stack.Toolbar>

			<ScrollView
				className="flex-1 bg-background"
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
				contentInsetAdjustmentBehavior="always"
			>
				<ServerSettingsSheet />

				<View className="gap-4 pt-4 flex flex-1">
					<ContinueReading />
					<OnDeck />
					<RecentlyAddedSeriesHorizontal />
					<RecentlyAddedBooks />
				</View>
			</ScrollView>
		</>
	)
}
