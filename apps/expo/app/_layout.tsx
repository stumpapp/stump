import '~/global.css'

import { DarkTheme, DefaultTheme, Theme, ThemeProvider } from '@react-navigation/native'
import { PortalHost } from '@rn-primitives/portal'
import * as Sentry from '@sentry/react-native'
import { getColor, to } from 'colorjs.io/fn'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator'
import { Stack, useNavigationContainerRef } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import LottieView from 'lottie-react-native'
import * as React from 'react'
import { AppState, Platform, View } from 'react-native'
import { SystemBars } from 'react-native-edge-to-edge'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Toaster } from 'sonner-native'

import darkSplash from '~/assets/splash/dark.json'
import lightSplash from '~/assets/splash/light.json'
import { PerformanceMonitor } from '~/components/PerformanceMonitor'
import { BottomSheet } from '~/components/ui/bottom-sheet'
import { db } from '~/db'
import migrations from '~/drizzle/migrations'
import { reactNavigationIntegration } from '~/index'
import { setAndroidNavigationBar } from '~/lib/android-navigation-bar'
import { NAV_THEME, useColors } from '~/lib/constants'
import { useColorScheme } from '~/lib/useColorScheme'
import { usePreferencesStore } from '~/stores'
import { useEpubLocationStore, useEpubTheme } from '~/stores/epub'
import { useHideSystemBars, useReaderStore } from '~/stores/reader'

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

const IS_DEVELOPMENT = process.env.NODE_ENV === 'development'

export default function RootLayout() {
	const navigationRef = useNavigationContainerRef()

	const { colorScheme, isDarkColorScheme } = useColorScheme()

	const [isColorSchemeLoaded, setIsColorSchemeLoaded] = React.useState(false)

	const [isAnimationReady, setIsAnimationReady] = React.useState(false)
	const [isReady, setIsReady] = React.useState(false)

	const { error } = useMigrations(db, migrations)

	const animation = React.useRef<LottieView>(null)
	const { hideStatusBar, hideNavigationBar } = useHideSystemBars()
	const hasMounted = React.useRef(false)

	const colors = useColors()
	const insets = useSafeAreaInsets()

	const { performanceMonitor, animationEnabled, disableDismissGesture } = usePreferencesStore(
		(state) => ({
			animationEnabled: !state.reduceAnimations,
			performanceMonitor: state.performanceMonitor,
			disableDismissGesture: state.disableDismissGesture,
		}),
	)
	const isReading = useReaderStore((state) => state.isReading)
	const isReadingEbook = useEpubLocationStore((state) => !!state.book)
	const { colors: epubThemeColors } = useEpubTheme()

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

	React.useEffect(() => {
		if (navigationRef) {
			reactNavigationIntegration.registerNavigationContainer(navigationRef)
		}
	}, [navigationRef])

	React.useEffect(() => {
		if (error) {
			Sentry.captureException(error)
		}
	}, [error])

	React.useEffect(() => {
		const subscription = AppState.addEventListener('memoryWarning', (status) => {
			Sentry.addBreadcrumb({
				category: 'system',
				message: 'Memory warning received',
				level: 'warning',
				data: {
					appStateStatus: status,
				},
			})
		})
		return () => subscription.remove()
	}, [])

	let isDarkEpubTheme: boolean = isDarkColorScheme
	if (epubThemeColors?.background && isReadingEbook) {
		const backgroundColor = getColor(epubThemeColors?.background)
		const foregroundColor = getColor(epubThemeColors?.foreground)

		const backgroundLightness = to(backgroundColor, 'oklch').coords[0]
		const foregroundLightness = to(foregroundColor, 'oklch').coords[0]

		// Choosing based on relative difference rather than e.g. absolute lightness < 0.5 seems
		// to look much better for edge cases near the boundry
		isDarkEpubTheme = foregroundLightness > backgroundLightness
	}

	const isDarkBackground = isReadingEbook ? isDarkEpubTheme : isDarkColorScheme || isReading

	if (!isColorSchemeLoaded || !isAnimationReady) {
		return <View className="flex-1 bg-background" />
	}

	// Note: To avoid the animation playing on every reload during development, we skip it entirely in dev mode.
	// If you need to see the animation in dev mode, set IS_DEVELOPMENT to false above.
	if (!isReady && !IS_DEVELOPMENT) {
		return (
			<View
				style={{
					flex: 1,
					backgroundColor: isDarkColorScheme ? '#000000' : '#F4E8E0',
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
				{performanceMonitor && <PerformanceMonitor style={{ top: insets.top || 12 }} />}
				<BottomSheet.Provider>
					<KeyboardProvider>
						<SystemBars
							style={isDarkBackground ? 'light' : 'dark'}
							hidden={{ statusBar: hideStatusBar, navigationBar: hideNavigationBar }}
						/>
						<Stack
							// https://github.com/expo/expo/issues/15244 ?
							// screenOptions={{
							// 	statusBarHidden: shouldHideStatusBar,
							// }}
							screenOptions={{
								animation: animationEnabled ? 'default' : 'none',
								contentStyle: {
									backgroundColor: colors.background.DEFAULT,
								},
							}}
						>
							<Stack.Screen
								name="(tabs)"
								options={{
									headerShown: false,
									title: '',
									animation: animationEnabled ? 'default' : 'none',
								}}
							/>
							<Stack.Screen
								name="server/[id]"
								options={{
									headerShown: false,
									title: '',
									animation: animationEnabled ? 'default' : 'none',
									autoHideHomeIndicator: hideNavigationBar,
									contentStyle: {
										backgroundColor: colors.background.DEFAULT,
									},
								}}
							/>
							<Stack.Screen
								name="opds/[id]"
								options={{
									headerShown: false,
									animation: animationEnabled ? 'default' : 'none',
								}}
							/>

							<Stack.Screen
								name="offline"
								options={{
									headerShown: false,
									title: '',
									animation: animationEnabled ? 'default' : 'none',
									autoHideHomeIndicator: hideNavigationBar,
									presentation:
										disableDismissGesture && Platform.OS === 'ios' ? 'fullScreenModal' : undefined,
									contentStyle: {
										backgroundColor: colors.background.DEFAULT,
									},
								}}
							/>
						</Stack>
						<PortalHost />
					</KeyboardProvider>
				</BottomSheet.Provider>
				<Toaster position="bottom-center" />
			</ThemeProvider>
		</GestureHandlerRootView>
	)
}

const useIsomorphicLayoutEffect =
	Platform.OS === 'web' && typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect

// TODO: https://hugeicons.com/ ?
