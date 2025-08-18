import '~/global.css'

import { DarkTheme, DefaultTheme, Theme, ThemeProvider } from '@react-navigation/native'
import { PortalHost } from '@rn-primitives/portal'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import LottieView from 'lottie-react-native'
import * as React from 'react'
import { Platform, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import darkSplash from '~/assets/splash/dark.json'
import lightSplash from '~/assets/splash/light.json'
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

// Instruct SplashScreen not to hide yet, we want to do this manually
SplashScreen.preventAutoHideAsync().catch(() => {
	/* reloading the app might trigger some race conditions, ignore them */
})

// TODO: hide status bar when reading
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development'

export default function RootLayout() {
	const { colorScheme, isDarkColorScheme } = useColorScheme()

	const [isColorSchemeLoaded, setIsColorSchemeLoaded] = React.useState(false)

	const [isAnimationReady, setIsAnimationReady] = React.useState(false)
	const [isReady, setIsReady] = React.useState(false)

	const animation = React.useRef<LottieView>(null)
	const shouldHideStatusBar = useHideStatusBar()
	const hasMounted = React.useRef(false)

	const animationEnabled = usePreferencesStore((state) => !state.reduceAnimations)

	useIsomorphicLayoutEffect(() => {
		if (hasMounted.current) {
			return
		}
		setAndroidNavigationBar(colorScheme)
		setIsColorSchemeLoaded(true)
		hasMounted.current = true

		SplashScreen.hideAsync().then(() => {
			setIsAnimationReady(true)
		})
	}, [])

	if (!isColorSchemeLoaded || !isAnimationReady) {
		return null
	}

	if (!isReady && !IS_DEVELOPMENT) {
		return (
			<View
				style={{
					flex: 1,
				}}
			>
				<LottieView
					autoPlay
					ref={animation}
					source={colorScheme === 'dark' ? darkSplash : lightSplash}
					style={{
						flex: 1,
					}}
					loop={false}
					onAnimationFinish={() => setIsReady(true)}
				/>
			</View>
		)
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
								animation: animationEnabled ? 'default' : 'none',
							}}
						/>
						<Stack.Screen
							name="server/[id]"
							options={{
								headerShown: false,
								animation: animationEnabled ? 'default' : 'none',
							}}
						/>
						<Stack.Screen
							name="server/[id]/(tabs)"
							options={{
								headerShown: false,
								animation: animationEnabled ? 'default' : 'none',
							}}
						/>
						<Stack.Screen
							name="server/[id]/libraries/[id]"
							options={{
								headerShown: false,
								animation: animationEnabled ? 'default' : 'none',
							}}
						/>
						<Stack.Screen
							name="server/[id]/series/[id]"
							options={{
								headerShown: false,
								animation: animationEnabled ? 'default' : 'none',
							}}
						/>
						<Stack.Screen
							name="server/[id]/books/[id]"
							options={{
								headerShown: false,
								animation: animationEnabled ? 'default' : 'none',
							}}
						/>
						<Stack.Screen
							name="opds/[id]"
							options={{
								headerShown: false,
								animation: animationEnabled ? 'default' : 'none',
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

// TODO: https://hugeicons.com/ ?
