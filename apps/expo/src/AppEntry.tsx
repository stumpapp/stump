import { StumpClientContextProvider } from '@stump/client'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'

import App from './App'

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync()

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
		<StumpClientContextProvider>
			<App />
		</StumpClientContextProvider>
	)
}
