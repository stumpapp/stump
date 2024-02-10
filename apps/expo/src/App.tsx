// import { NavigationContainer } from '@react-navigation/native'
import { StatusBar } from 'expo-status-bar'
import { Text, View } from 'react-native'

// TODO: Setup React Navigation: https://reactnavigation.org/docs/getting-started/
// 3 main route groups:
// - Cannot connect to server
// - Unathenticated
// - Authenticated

export default function App() {
	return (
		<View className="flex-1 items-center justify-center">
			<Text>Open up App.tsx to start working on your app!</Text>
			<StatusBar style="auto" />
		</View>
	)
}
