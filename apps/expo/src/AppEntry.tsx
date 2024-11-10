import { StumpClientContextProvider } from '@stump/client'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'

import App from './App'
import { useAppStore, useUserStore } from './stores'

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync()

export function AppEntry() {
	const [loaded, error] = useFonts({
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
	})

	const setUser = useUserStore((store) => store.setUser)
	const setIsConnectedWithServer = useAppStore((store) => store.setIsConnectedWithServer)

	// Expo Router uses Error Boundaries to catch errors in the navigation tree.
	useEffect(() => {
		if (error) throw error
	}, [error])

	const handleUnauthenticatedResponse = () => setUser(null)
	const handleConnectionWithServerChanged = (isConnected: boolean) =>
		setIsConnectedWithServer(isConnected)

	if (!loaded) {
		return null
	}

	return (
		<StumpClientContextProvider
			onUnauthenticatedResponse={handleUnauthenticatedResponse}
			onConnectionWithServerChanged={handleConnectionWithServerChanged}
		>
			<App />
		</StumpClientContextProvider>
	)
}
