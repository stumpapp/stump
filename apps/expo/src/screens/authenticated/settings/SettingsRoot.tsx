import React from 'react'

import { ScreenRootView, Text, View } from '@/components'

import SettingsListItem from './SettingsListItem'

// FIXME: status bar not working?
export default function SettingsRoot() {
	return (
		<ScreenRootView className="items-start justify-start space-y-6 px-4">
			<View className="w-full">
				<Text muted size="sm">
					App settings
				</Text>
				<View className="mt-1 w-full divide-y rounded-md dark:divide-gray-700 dark:bg-gray-800">
					{appRoutes.map((route, index) => (
						<View key={index} className="w-full">
							<SettingsListItem title={route.title} to={route.to} />
						</View>
					))}
				</View>
			</View>

			<View className="w-full">
				<Text muted size="sm">
					Server settings
				</Text>
				<View className="mt-1 w-full divide-y rounded-md dark:divide-gray-700 dark:bg-gray-800">
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

const appRoutes = [
	{
		title: 'Appearance',
		to: 'AppearanceSettings',
	},
	{
		title: 'Account',
		to: 'AccountSettings',
	},
]

const serverRoutes = [
	{
		title: 'General',
		to: 'ServerGeneralSettings',
	},
	{
		title: 'Jobs',
		to: 'ServerJobsSettings',
	},
]
