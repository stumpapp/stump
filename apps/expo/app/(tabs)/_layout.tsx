import { Tabs } from 'expo-router'
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs'
import { HardDriveDownload, Server, Settings } from 'lucide-react-native'
import { Platform } from 'react-native'

import { AddServerDialog } from '~/components/savedServer'
import { Icon as JSIcon } from '~/components/ui'
import { useColors } from '~/lib/constants'
import { cn } from '~/lib/utils'
import { usePreferencesStore } from '~/stores'

export default function TabLayout() {
	const colors = useColors()
	const accentColor = usePreferencesStore((state) => state.accentColor)

	return Platform.select({
		ios: (
			<NativeTabs
				minimizeBehavior="onScrollDown"
				tintColor={accentColor || colors.fill.brand.DEFAULT}
			>
				<NativeTabs.Trigger name="index">
					<Label>Servers</Label>
					<Icon sf="server.rack" drawable="custom_android_drawable" />
				</NativeTabs.Trigger>
				<NativeTabs.Trigger name="downloads">
					<Label>Downloads</Label>
					<Icon sf="arrow.down.circle" drawable="custom_android_drawable" />
				</NativeTabs.Trigger>
				<NativeTabs.Trigger name="settings">
					<Label>Settings</Label>
					<Icon sf="gear" drawable="custom_android_drawable" />
				</NativeTabs.Trigger>
			</NativeTabs>
		),

		android: (
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
							<JSIcon
								as={Server}
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
							<JSIcon
								as={HardDriveDownload}
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
							<JSIcon
								as={Settings}
								className={cn('h-6 w-6 text-foreground-muted', { 'text-foreground': focused })}
							/>
						),
						// Hide the header for this route
						headerShown: false,
					}}
				/>
			</Tabs>
		),
	})
}
