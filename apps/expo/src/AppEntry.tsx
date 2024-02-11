import { queryClient, QueryClientContext, QueryClientProvider } from '@stump/client'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'

import App from './App'
import { initializeApi } from '@stump/api'

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

	useEffect(() => {
		if (loaded) {
			SplashScreen.hideAsync()
			// TODO: This needs to move to lower in the tree
			initializeApi('http://localhost:10801', 'v1')
		}
	}, [loaded])

	if (!loaded) {
		return null
	}

	return (
		<QueryClientContext.Provider value={queryClient}>
			<QueryClientProvider client={queryClient}>
				<App />
			</QueryClientProvider>
		</QueryClientContext.Provider>
	)
}
