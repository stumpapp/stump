import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuthQuery } from '@stump/client'
import { isAxiosError } from '@stump/sdk'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AuthenticatedNavigator } from './screens/authenticated'
import LoginOrClaim from './screens/LoginOrClaim'
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
		SplashScreen.hideAsync()
	}, [])

	useEffect(() => {
		// TODO: ios vs android?
		setPlatform('mobile')
	}, [setPlatform])

	// TODO: remove, just debugging stuff
	useEffect(() => {
		// setBaseUrl('https://demo.stumpapp.dev')
		// setBaseUrl('http://localhost:10801')
		setBaseUrl('http://192.168.0.188:10801')
	}, [setBaseUrl])

	// TODO: An offline-only stack which allows for reading of downloaded content
	const renderApp = () => {
		// if (!isConnectedToServer) {
		// 	return (
		// 		<Stack.Screen
		// 			name="Server SOS"
		// 			component={ServerNotAccessible}
		// 			options={{ headerShown: false }}
		// 		/>
		// 	)
		// } else
		if (!storeUser) {
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

	return (
		<SafeAreaProvider>
			<NavigationContainer>
				<Stack.Navigator>{renderApp()}</Stack.Navigator>
			</NavigationContainer>
		</SafeAreaProvider>
	)
}
