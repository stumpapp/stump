import { createNativeStackNavigator } from '@react-navigation/native-stack'

import BookOverview from './BookOverview'
import { BookReader } from './reader'

const Stack = createNativeStackNavigator()

export default function BookStackNavigator() {
	return (
		<Stack.Navigator>
			<Stack.Screen name="BookOverview" component={BookOverview} options={{ headerShown: false }} />
			<Stack.Screen name="BookReader" component={BookReader} options={{ headerShown: false }} />
		</Stack.Navigator>
	)
}
