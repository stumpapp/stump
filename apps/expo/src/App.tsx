import { useAuthQuery } from '@stump/client'
import { StatusBar } from 'expo-status-bar'
import { Text, View } from 'react-native'

// TODO: Setup React Navigation: https://reactnavigation.org/docs/getting-started/
// 3 main route groups:
// - Cannot connect to server
// - Unathenticated
// - Authenticated

export default function App() {
	const { error } = useAuthQuery({})

	console.log(error)

	return (
		<View className="flex-1 items-center justify-center">
			<Text>I guess pnpm has to go!!</Text>
			<StatusBar style="auto" />
		</View>
	)
}
