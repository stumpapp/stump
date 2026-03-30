import { Host, Image } from '@expo/ui/swift-ui'
import { UserPermission } from '@stump/graphql'
import { Link, Stack } from 'expo-router'
import { Plus } from 'lucide-react-native'
import { Platform } from 'react-native'

import { useActiveServer, useStumpServer } from '~/components/activeServer'
import ChevronBackLink from '~/components/ChevronBackLink'
import { Icon } from '~/components/ui'
import { IS_IOS_24_PLUS } from '~/lib/constants'
import { usePreferencesStore } from '~/stores'

export default function Layout() {
	const animationEnabled = usePreferencesStore((state) => !state.reduceAnimations)
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { checkPermission } = useStumpServer()

	const canCreateClubs = checkPermission(UserPermission.CreateBookClub)

	return (
		<Stack screenOptions={{ headerShown: false, animation: animationEnabled ? 'default' : 'none' }}>
			<Stack.Screen
				name="index"
				options={{
					headerShown: true,
					headerTitle: 'Clubs',
					headerTransparent: Platform.OS === 'ios',
					headerBlurEffect: IS_IOS_24_PLUS ? undefined : 'regular',
					headerLargeTitle: true,
					headerLargeTitleStyle: { fontSize: 30 },
					headerRight: canCreateClubs
						? () => <Link href={`/server/${serverID}/clubs/create`}>{PlusIcon}</Link>
						: undefined,
				}}
			/>

			<Stack.Screen
				name="invites"
				options={{
					headerShown: true,
					title: 'Invites',
					headerTransparent: Platform.OS === 'ios',
					headerBlurEffect: IS_IOS_24_PLUS ? undefined : 'regular',
					animation: animationEnabled ? 'default' : 'none',
					presentation: 'formSheet',
					headerLeft: Platform.OS === 'android' ? undefined : () => <ChevronBackLink />,
				}}
			/>

			{canCreateClubs && (
				<Stack.Screen
					name="create"
					options={{
						headerShown: true,
						title: 'Create Club',
						headerTransparent: Platform.OS === 'ios',
						headerBlurEffect: IS_IOS_24_PLUS ? undefined : 'regular',
						presentation: 'formSheet',
						animation: animationEnabled ? 'default' : 'none',
						headerLeft: Platform.OS === 'android' ? undefined : () => <ChevronBackLink />,
					}}
				/>
			)}
		</Stack>
	)
}

const PlusIcon = Platform.select({
	ios: (
		<Host matchContents>
			<Image systemName="plus" />
		</Host>
	),
	android: <Icon as={Plus} className="shadow" />,
})
