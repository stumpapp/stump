import FontAwesome from '@expo/vector-icons/FontAwesome'
import { Tabs } from 'expo-router'

import { AddServerDialog } from '~/components/savedServer'

export default function TabLayout() {
	return (
		<Tabs screenOptions={{ tabBarActiveTintColor: 'white' }}>
			<Tabs.Screen
				name="index"
				options={{
					title: 'Servers',
					tabBarIcon: ({ color }) => <FontAwesome size={20} name="database" color={color} />,
					headerRight: () => <AddServerDialog />,
				}}
			/>
			<Tabs.Screen
				name="downloads"
				options={{
					title: 'Downloads',
					tabBarIcon: ({ color }) => <FontAwesome size={20} name="download" color={color} />,
				}}
			/>
			<Tabs.Screen
				name="settings"
				options={{
					title: 'Settings',
					tabBarIcon: ({ color }) => <FontAwesome size={20} name="cog" color={color} />,
				}}
			/>
		</Tabs>
	)
}
