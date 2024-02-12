import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { checkUrl, initializeApi, isAxiosError, isUrl } from '@stump/api'
import { useAppStore, useAuthQuery, useUserStore } from '@stump/client'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect, useState } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AuthenticatedNavigator } from './screens/authenticated'
import LoginOrClaim from './screens/LoginOrClaim'
import ServerNotAccessible from './screens/ServerNotAccessible'

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

	const [isReady, setIsReady] = useState(false)
	const [isConnectedToServer, setIsConnectedToServer] = useState(false)

	const { error } = useAuthQuery({
		enabled: !storeUser && !!baseUrl && isConnectedToServer,
		onSuccess: setStoreUser,
	})

	useEffect(() => {
		if (!error) return

		const axiosError = isAxiosError(error) ? error : null
		const isNetworkError = axiosError?.code === 'ERR_NETWORK'
		if (isNetworkError) {
			setIsConnectedToServer(false)
		}
	}, [error])

	useEffect(() => {
		// TODO: ios vs androind?
		setPlatform('mobile')
	}, [setPlatform])

	// TODO: remove, just debugging stuff
	useEffect(() => {
		setBaseUrl('https://demo.stumpapp.dev')
	}, [setBaseUrl])

	useEffect(() => {
		if (isReady) {
			SplashScreen.hideAsync()
		}
	}, [isReady])

	console.log({ baseUrl, isConnectedToServer, isReady, storeUser })

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
	}, [baseUrl])

	const renderApp = () => {
		if (!isConnectedToServer) {
			return <Stack.Screen name="Server SOS" component={ServerNotAccessible} />
		} else if (!storeUser) {
			return <Stack.Screen name="Login" component={LoginOrClaim} />
		} else {
			return <AuthenticatedNavigator />
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
