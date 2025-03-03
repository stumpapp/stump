import '~/global.css'

import { DarkTheme, DefaultTheme, Theme, ThemeProvider } from '@react-navigation/native'
import { PortalHost } from '@rn-primitives/portal'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as React from 'react'
import { Platform } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { BottomSheet } from '~/components/ui/bottom-sheet'
import { setAndroidNavigationBar } from '~/lib/android-navigation-bar'
import { NAV_THEME } from '~/lib/constants'
import { useColorScheme } from '~/lib/useColorScheme'
import { usePreferencesStore } from '~/stores'
import { useHideStatusBar } from '~/stores/reader'

dayjs.extend(relativeTime)
dayjs.extend(duration)

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

	const shouldHideStatusBar = useHideStatusBar()
	const hasMounted = React.useRef(false)

	const animationEnabled = usePreferencesStore((state) => !state.reduceAnimations)

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
			<ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
				<BottomSheet.Provider>
					{/* TODO: This pushes content when entering/exiting */}
					<StatusBar style={isDarkColorScheme ? 'light' : 'dark'} hidden={shouldHideStatusBar} />
					<Stack
						// https://github.com/expo/expo/issues/15244 ?
						// screenOptions={{
						// 	statusBarHidden: shouldHideStatusBar,
						// }}
						screenOptions={{
							animation: animationEnabled ? 'default' : 'none',
						}}
					>
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
