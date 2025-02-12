import '~/global.css'

import { DarkTheme, DefaultTheme, Theme, ThemeProvider } from '@react-navigation/native'
import { PortalHost } from '@rn-primitives/portal'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as React from 'react'
import { Platform } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { BottomSheet } from '~/components/ui/bottom-sheet'
import { setAndroidNavigationBar } from '~/lib/android-navigation-bar'
import { NAV_THEME } from '~/lib/constants'
import { useColorScheme } from '~/lib/useColorScheme'

const LIGHT_THEME: Theme = {
	...DefaultTheme,
	colors: NAV_THEME.light,
}
const DARK_THEME: Theme = {
	...DarkTheme,
	colors: NAV_THEME.dark,
}

export {
	// Catch any errors thrown by the Layout component.
	ErrorBoundary,
} from 'expo-router'

// TODO: hide status bar when reading

export default function RootLayout() {
	const { colorScheme, isDarkColorScheme } = useColorScheme()

	const [isColorSchemeLoaded, setIsColorSchemeLoaded] = React.useState(false)

	const hasMounted = React.useRef(false)

	useIsomorphicLayoutEffect(() => {
		if (hasMounted.current) {
			return
		}

		if (Platform.OS === 'web') {
			// Adds the background color to the html element to prevent white background on overscroll.
			document.documentElement.classList.add('bg-background')
		}
		setAndroidNavigationBar(colorScheme)
		setIsColorSchemeLoaded(true)
		hasMounted.current = true
	}, [])

	if (!isColorSchemeLoaded) {
		return null
	}

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			{/* TODO: determine if I need this? */}
			<ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
				<BottomSheet.Provider>
					<StatusBar style={isDarkColorScheme ? 'light' : 'dark'} />
					<Stack>
						<Stack.Screen
							name="(tabs)"
							options={{
								headerShown: false,
							}}
						/>
						<Stack.Screen
							name="server/[id]"
							options={{
								headerShown: false,
							}}
						/>
						<Stack.Screen
							name="server/[id]/(tabs)"
							options={{
								headerShown: false,
							}}
						/>
						<Stack.Screen
							name="server/[id]/libraries/[id]"
							options={{
								headerShown: false,
							}}
						/>
						<Stack.Screen
							name="server/[id]/series/[id]"
							options={{
								headerShown: false,
							}}
						/>
						<Stack.Screen
							name="server/[id]/books/[id]"
							options={{
								headerShown: false,
							}}
						/>
						<Stack.Screen
							name="opds/[id]"
							options={{
								headerShown: false,
							}}
						/>
					</Stack>
					<PortalHost />
				</BottomSheet.Provider>
			</ThemeProvider>
		</GestureHandlerRootView>
	)
}

const useIsomorphicLayoutEffect =
	Platform.OS === 'web' && typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect
