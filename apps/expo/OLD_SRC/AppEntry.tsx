import '../global.css'

import { SDKProvider, StumpClientContextProvider } from '@stump/client'
import { useFonts } from 'expo-font'
// import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'

import App from './App'
import { useAppStore, useUserStore } from './stores'

// Prevent the splash screen from auto-hiding before asset loading is complete.
// SplashScreen.preventAutoHideAsync()

export function AppEntry() {
	const [loaded, error] = useFonts({
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
	})

	const setUser = useUserStore((store) => store.setUser)
	const setIsConnectedWithServer = useAppStore((store) => store.setIsConnectedWithServer)
	const baseURL = useAppStore((store) => store.baseUrl)
	const setBaseUrl = useAppStore((store) => store.setBaseUrl)

	// TODO: remove, just debugging stuff
	useEffect(() => {
		// setBaseUrl('https://demo.stumpapp.dev')
		// setBaseUrl('http://localhost:10801')
		setBaseUrl('http://192.168.0.188:10801')
	}, [setBaseUrl])

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

	// TODO: This is the 'app' once connected with the server. There needs to be a 'parent app' which allows:
	// - Creating / managing / selecting servers
	// - Offline reading
	// - Global settings?

	return (
		<StumpClientContextProvider
			onUnauthenticatedResponse={handleUnauthenticatedResponse}
			onConnectionWithServerChanged={handleConnectionWithServerChanged}
			// TODO: persist token in AsyncStorage
			onAuthenticated={() => {}}
		>
			<SDKProvider baseURL={baseURL || ''} authMethod="token">
				<App />
			</SDKProvider>
		</StumpClientContextProvider>
	)
}
