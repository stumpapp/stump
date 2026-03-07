import { useSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { Stack, useLocalSearchParams } from 'expo-router'
import { Platform } from 'react-native'

import { BookClubContext } from '~/components/bookClub/context'
import ChevronBackLink from '~/components/ChevronBackLink'
import { IS_IOS_24_PLUS } from '~/lib/constants'
import { usePreferencesStore } from '~/stores'

const clubContextQuery = graphql(`
	query BookClubContextLayout($id: ID!) {
		bookClubById(id: $id) {
			id
			membership {
				id
				role
			}
		}
	}
`)

export default function Screen() {
	const { clubId } = useLocalSearchParams<{ clubId: string }>()
	const animationEnabled = usePreferencesStore((state) => !state.reduceAnimations)

	const { data } = useSuspenseGraphQL(clubContextQuery, ['bookClubContext', clubId], {
		id: clubId,
	})

	const club = data.bookClubById

	return (
		<BookClubContext.Provider value={{ clubId: club.id, viewerMembership: club.membership }}>
			<Stack screenOptions={{ animation: animationEnabled ? 'default' : 'none' }}>
				<Stack.Screen
					name="index"
					options={{
						headerShown: false,
						title: '',
						headerTransparent: Platform.OS === 'ios',
						headerBlurEffect: IS_IOS_24_PLUS ? undefined : 'regular',
						headerLargeTitleStyle: {
							fontSize: 30,
						},
						headerLargeTitle: Platform.OS === 'ios',
						animation: animationEnabled ? 'default' : 'none',
						headerLeft: Platform.OS === 'android' ? undefined : () => <ChevronBackLink />,
					}}
				/>
				<Stack.Screen
					name="settings"
					options={{
						presentation: 'modal',
						headerShown: true,
						title: 'Club Settings',
					}}
				/>

				<Stack.Screen
					name="archive"
					options={{
						title: 'Archive',
						headerShown: false,
					}}
				/>

				<Stack.Screen
					name="discussion/[roomId]"
					options={{
						headerShown: false,
						title: '',
						headerTransparent: Platform.OS === 'ios',
						headerBlurEffect: IS_IOS_24_PLUS ? undefined : 'regular',
						headerLeft: Platform.OS === 'android' ? undefined : () => <ChevronBackLink />,
					}}
				/>
			</Stack>
		</BookClubContext.Provider>
	)
}
