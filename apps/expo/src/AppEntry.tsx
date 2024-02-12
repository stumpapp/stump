import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { lazy, Suspense, useEffect } from 'react'

import { LocalStorage } from './localStorage'

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync()

// FIXME: this doesn't seem to be working still... Investigate
// Set global persist storage to AsyncStorage
// setGlobalPersistStorage(() => AsyncStorage)
globalThis.localStorage = new LocalStorage()

// Lazy load the app to prevent zustand from being initialized before the globalThis.localStorage is set
const LazyApp = lazy(async () => {
	return await import('./App')
})

export function AppEntry() {
	const [loaded, error] = useFonts({
		SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
	})

	// Expo Router uses Error Boundaries to catch errors in the navigation tree.
	useEffect(() => {
		if (error) throw error
	}, [error])

	if (!loaded) {
		return null
	}

	// NOTE: react navigate advises against manual redirect? so for now we don't supply onRedirect...
	return (
		<Suspense fallback={null}>
			<LazyApp />
		</Suspense>
	)
}
