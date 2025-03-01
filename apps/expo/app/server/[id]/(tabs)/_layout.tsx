import { useAuthQuery, useSDK } from '@stump/client'
import { Tabs } from 'expo-router'

import { icons } from '~/components/ui'
import { useColors } from '~/lib/constants'
import { cn } from '~/lib/utils'
import { useUserStore } from '~/stores'

const { Home, SquareLibrary, Search } = icons

export default function TabLayout() {
	const { sdk } = useSDK()

	const colors = useColors()
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
		<Tabs screenOptions={{ tabBarActiveTintColor: colors.foreground.DEFAULT }}>
			<Tabs.Screen
				name="index"
				options={{
					title: 'Home',
					tabBarIcon: ({ focused }) => (
						<Home className={cn('h-6 w-6 text-foreground-muted', { 'text-foreground': focused })} />
					),
					headerShown: false,
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
