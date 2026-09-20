import * as NavigationBar from 'expo-navigation-bar'
import { Platform } from 'react-native'

export async function setAndroidNavigationBar(theme: 'light' | 'dark') {
	if (Platform.OS !== 'android') return
	// TODO(android): these methods no longer existed, and i swapped to a
	// deprecated method, so i need to figure out whatever the more cannonical
	// way to do this is but for now this is fine
	// await NavigationBar.setButtonStyleAsync(theme === 'dark' ? 'light' : 'dark')
	// await NavigationBar.setBackgroundColorAsync(
	// 	theme === 'dark' ? NAV_THEME.dark.background : NAV_THEME.light.background,
	// )
	NavigationBar.setStyle(theme === 'dark' ? 'light' : 'dark')
}
