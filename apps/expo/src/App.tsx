import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { checkUrl, initializeApi, isAxiosError, isUrl } from '@stump/api'
import { useAuthQuery } from '@stump/client'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect, useState } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AuthenticatedNavigator } from './screens/authenticated'
import LoginOrClaim from './screens/LoginOrClaim'
import ServerNotAccessible from './screens/ServerNotAccessible'
import { useAppStore, useUserStore } from './stores'

const Stack = createNativeStackNavigator()

export default function AppWrapper() {
	const { baseUrl, setBaseUrl, setPlatform } = useAppStore((store) => ({
		baseUrl: store.baseUrl,
		setBaseUrl: store.setBaseUrl,
		setPlatform: store.setPlatform,
	}))

	const { storeUser, setStoreUser } = useUserStore((state) => ({
		setStoreUser: state.setUser,
		storeUser: state.user,
	}))
	const { isConnectedToServer, setIsConnectedToServer } = useAppStore((store) => ({
		isConnectedToServer: store.isConnectedWithServer,
		setIsConnectedToServer: store.setIsConnectedWithServer,
	}))

	const [isReady, setIsReady] = useState(false)

	const { error } = useAuthQuery({
		enabled: !storeUser && !!baseUrl && isConnectedToServer,
		onSuccess: setStoreUser,
	})

	// TODO: This might not be needed anymore after refactoring the client, check this
	useEffect(() => {
		if (!error) return

		const axiosError = isAxiosError(error) ? error : null
		const isNetworkError = axiosError?.code === 'ERR_NETWORK'
		if (isNetworkError) {
			setIsConnectedToServer(false)
		}
	}, [error, setIsConnectedToServer])

	useEffect(() => {
		// TODO: ios vs androind?
		setPlatform('mobile')
	}, [setPlatform])

	// TODO: remove, just debugging stuff
	useEffect(() => {
		// setBaseUrl('https://demo.stumpapp.dev')
		setBaseUrl('http://localhost:10801')
		// setBaseUrl('http://192.168.0.202:10801')
	}, [setBaseUrl])

	useEffect(() => {
		if (isReady) {
			SplashScreen.hideAsync()
		}
	}, [isReady])

	/**
	 * An effect that will verify the baseUrl is accessible to the app.
	 */
	useEffect(() => {
		// TODO: handle errors!
		async function handleVerifyConnection() {
			if (!isUrl(baseUrl)) {
				console.error('Invalid URL')
			} else {
				const isValid = await checkUrl(baseUrl)

				if (!isValid) {
					console.error(`Failed to connect to ${baseUrl}`)
				} else {
					initializeApi(baseUrl, 'v1')
					setIsConnectedToServer(true)
				}
			}

			setIsReady(true)
		}

		if (baseUrl) {
			handleVerifyConnection()
		} else {
			setIsReady(true)
		}
	}, [baseUrl, setIsConnectedToServer])

	// TODO: An offline-only stack which allows for reading of downloaded content
	const renderApp = () => {
		if (!isConnectedToServer) {
			return (
				<Stack.Screen
					name="Server SOS"
					component={ServerNotAccessible}
					options={{ headerShown: false }}
				/>
			)
		} else if (!storeUser) {
			return <Stack.Screen name="Login" component={LoginOrClaim} options={{ headerShown: false }} />
		} else {
			return (
				<Stack.Screen
					name="Authenticated"
					component={AuthenticatedNavigator}
					options={{ headerShown: false }}
				/>
			)
		}
	}

	if (!isReady) return null

	return (
		<SafeAreaProvider>
			<NavigationContainer>
				<Stack.Navigator>{renderApp()}</Stack.Navigator>
			</NavigationContainer>
		</SafeAreaProvider>
	)
}
