import { useAuthQuery, useSDK } from '@stump/client'
import { Tabs, useRouter } from 'expo-router'
import { View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'

import { icons } from '~/components/ui'
import { useColors } from '~/lib/constants'
import { cn } from '~/lib/utils'
import { usePreferencesStore, useUserStore } from '~/stores'

const { Unplug, Home, SquareLibrary, Search } = icons

export default function TabLayout() {
	const { sdk } = useSDK()

	const colors = useColors()
	const router = useRouter()
	const animationEnabled = usePreferencesStore((state) => !state.reduceAnimations)
	const setUser = useUserStore((state) => state.setUser)

	const { user } = useAuthQuery({
		enabled: !!sdk.token,
		onSuccess: setUser,
		useErrorBoundary: false,
	})

	if (!sdk.token || !user) {
		return null
	}

	return (
		<Tabs
			screenOptions={{
				tabBarActiveTintColor: colors.foreground.DEFAULT,
				animation: animationEnabled ? undefined : 'none',
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: 'Home',
					tabBarIcon: ({ focused }) => (
						<Home className={cn('h-6 w-6 text-foreground-muted', { 'text-foreground': focused })} />
					),
					headerLeft: () => (
						<Pressable onPress={() => router.dismissAll()}>
							{({ pressed }) => (
								<View
									className={cn(
										'aspect-square flex-1 items-start justify-center px-2',
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
					tabBarIcon: ({ focused }) => (
						<SquareLibrary
							className={cn('h-6 w-6 text-foreground-muted', { 'text-foreground': focused })}
						/>
					),
					headerShown: false,
				}}
			/>

			<Tabs.Screen
				name="search"
				options={{
					headerShown: false,
					title: 'Search',
					tabBarIcon: ({ focused }) => (
						<Search
							className={cn('h-6 w-6 text-foreground-muted', { 'text-foreground': focused })}
						/>
					),
				}}
			/>
		</Tabs>
	)
}
