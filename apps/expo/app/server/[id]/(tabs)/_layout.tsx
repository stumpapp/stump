import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useAuthQuery, useSDK } from '@stump/client'
import { Tabs, useRouter } from 'expo-router'
import { View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'

import { icons } from '~/components/ui'
import { cn } from '~/lib/utils'
import { useUserStore } from '~/stores'

const { Unplug, Plus } = icons

export default function TabLayout() {
	const { sdk } = useSDK()

	const router = useRouter()
	const setUser = useUserStore((state) => state.setUser)

	const { user } = useAuthQuery({
		enabled: !!sdk.token,
		onSuccess: setUser,
	})

	if (!sdk.token || !user) {
		return null
	}

	return (
		<Tabs screenOptions={{ tabBarActiveTintColor: 'white' }}>
			<Tabs.Screen
				name="index"
				options={{
					title: 'Home',
					tabBarIcon: ({ color }) => <FontAwesome size={20} name="home" color={color} />,
					headerLeft: () => (
						<Pressable onPress={() => router.dismissAll()}>
							{({ pressed }) => (
								<View
									className={cn(
										'aspect-square flex-1 items-start justify-center pt-0.5',
										pressed && 'opacity-70',
									)}
								>
									<Unplug size={20} className="text-foreground-muted" />
								</View>
							)}
						</Pressable>
					),
				}}
			/>

			<Tabs.Screen
				name="browse"
				options={{
					title: 'Browse',
					tabBarIcon: ({ color }) => <FontAwesome size={20} name="book" color={color} />,
					headerRight: () => (
						<Pressable>
							{({ pressed }) => (
								<View
									className={cn(
										'aspect-square flex-1 items-start justify-center pt-0.5',
										pressed && 'opacity-70',
									)}
								>
									<Plus size={20} className="text-foreground-muted" />
								</View>
							)}
						</Pressable>
					),
				}}
			/>

			<Tabs.Screen
				name="search"
				options={{
					headerShown: false,
					title: 'Search',
					tabBarIcon: ({ color }) => <FontAwesome size={20} name="search" color={color} />,
				}}
			/>
		</Tabs>
	)
}
