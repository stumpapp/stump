import { ScreenRootView, Text, View } from '@/components'

import SettingsListItem from './SettingsListItem'
import { SettingsScreen } from './SettingsNavigator'

// FIXME: status bar not working?
export default function SettingsRoot() {
	return (
		<ScreenRootView classes="h-full flex-1 items-start justify-start space-y-6">
			<View className="w-full px-4">
				<Text muted size="sm">
					App settings
				</Text>
				<View className="mt-1 w-full divide-y divide-gray-100/50 rounded-md bg-gray-50 dark:divide-gray-700 dark:bg-gray-800">
					{appRoutes.map((route, index) => (
						<View key={index} className="w-full">
							<SettingsListItem title={route.title} to={route.to} />
						</View>
					))}
				</View>
			</View>

			<View className="w-full px-4">
				<Text muted size="sm">
					Server settings
				</Text>
				<View className="mt-1 w-full divide-y divide-gray-100/50 rounded-md bg-gray-50 dark:divide-gray-700 dark:bg-gray-800">
					{serverRoutes.map((route, index) => (
						<View key={index} className="w-full">
							<SettingsListItem title={route.title} to={route.to} />
						</View>
					))}
				</View>
			</View>
		</ScreenRootView>
	)
}

type Route = {
	title: string
	to: SettingsScreen
}

const appRoutes: Route[] = [
	{
		title: 'Appearance',
		to: 'AppearanceSettings',
	},
	{
		title: 'Account',
		to: 'AccountSettings',
	},
]

const serverRoutes: Route[] = [
	// {
	// 	title: 'General',
	// 	to: 'ServerGeneralSettings',
	// },
	// {
	// 	title: 'Jobs',
	// 	to: 'ServerJobsSettings',
	// },
]
