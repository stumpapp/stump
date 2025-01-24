import { NavigationProp } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import BookOverview from './BookOverview'
import BookReaderScreen from './BookReaderScreen'

const Stack = createNativeStackNavigator()

export type ScreenNames = ['BookOverview', 'BookReader']
type ScreenParams = {
	params: {
		id: string
	}
}
export type BookStackScreenParamList = Record<ScreenNames[number], ScreenParams>
export type BookStackRootParamList = {
	BookStack: {
		params: ScreenParams['params']
		screen: ScreenNames[number]
	}
}
export type BookStackParamList = BookStackRootParamList & BookStackScreenParamList
export type BookStackNavigation = NavigationProp<BookStackParamList>

export default function BookStackNavigator() {
	return (
		<Stack.Navigator>
			<Stack.Screen name="BookOverview" component={BookOverview} options={{ headerShown: false }} />
			<Stack.Screen
				name="BookReader"
				component={BookReaderScreen}
				options={{ headerShown: false }}
			/>
		</Stack.Navigator>
	)
}
