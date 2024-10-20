import { NavigationProp } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import { AccountSettings, AppearanceSettings } from './app'
import SettingsRoot from './SettingsRoot'

const Stack = createNativeStackNavigator()

export type ScreenNames = ['SettingsRoot', 'AccountSettings', 'AppearanceSettings']
export type SettingsScreen = ScreenNames[number]
export type SettingsStackParamList = Record<ScreenNames[number], never>
export type SettingsStackNavigation = NavigationProp<SettingsStackParamList>

export default function SettingsNavigator() {
	return (
		<Stack.Navigator>
			<Stack.Screen name="SettingsRoot" component={SettingsRoot} options={{ headerShown: false }} />
			<Stack.Screen
				name="AccountSettings"
				component={AccountSettings}
				options={{ headerShown: false }}
			/>
			<Stack.Screen
				name="AppearanceSettings"
				component={AppearanceSettings}
				options={{ headerShown: false }}
			/>

			{/* ServerGeneralSettings  */}
			{/* ServerLogs  */}
			{/* Any other server screens  */}
		</Stack.Navigator>
	)
}
