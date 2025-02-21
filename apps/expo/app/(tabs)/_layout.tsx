import { Tabs } from 'expo-router'

import { AddServerDialog } from '~/components/savedServer'
import { icons } from '~/lib'
import { cn } from '~/lib/utils'

const { Server, HardDriveDownload, Settings } = icons

export default function TabLayout() {
	return (
		<Tabs screenOptions={{ tabBarActiveTintColor: 'white' }}>
			<Tabs.Screen
				name="index"
				options={{
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
				}}
			/>

			<Tabs.Screen
				name="ebook"
				options={{
					title: 'Ebook Test',
					tabBarIcon: ({ color }) => <FontAwesome size={20} name="cog" color={color} />,
				}}
			/>
		</Tabs>
	)
}
