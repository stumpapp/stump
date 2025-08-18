import { Tabs } from 'expo-router'

import { AddServerDialog } from '~/components/savedServer'
import { icons } from '~/lib'
import { useColors } from '~/lib/constants'
import { cn } from '~/lib/utils'

const { Server, HardDriveDownload, Settings } = icons

export default function TabLayout() {
	const colors = useColors()

	return (
		<Tabs
			screenOptions={{
				tabBarActiveTintColor: colors.foreground.DEFAULT,
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					headerShown: true,
					title: 'Servers',
					tabBarIcon: ({ focused }) => (
						<Server
							className={cn('h-6 w-6 text-foreground-muted', { 'text-foreground': focused })}
						/>
					),
					headerRight: () => <AddServerDialog />,
				}}
			/>
			<Tabs.Screen
				name="downloads"
				options={{
					title: 'Downloads',
					tabBarIcon: ({ focused }) => (
						<HardDriveDownload
							className={cn('h-6 w-6 text-foreground-muted', { 'text-foreground': focused })}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="settings"
				options={{
					title: 'Settings',
					tabBarIcon: ({ focused }) => (
						<Settings
							className={cn('h-6 w-6 text-foreground-muted', { 'text-foreground': focused })}
						/>
					),
					// Hide the header for this route
					headerShown: false,
				}}
			/>
		</Tabs>
	)
}
