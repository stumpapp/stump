import { NavigationProp } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import LibrariesList from './LibrariesList'
import LibrarySeriesBookList from './LibrarySeriesBooks'
import LibrarySeriesList from './LibrarySeriesList'

const Stack = createNativeStackNavigator()

export type LibraryStackScreenNames = ['Libraries', 'LibrarySeries', 'SeriesBooks']
export type LibraryStackScreenParams = {
	id: string
}
export type LibraryStackParamList = Record<
	LibraryStackScreenNames[number],
	LibraryStackScreenParams
> & {
	Libraries: never
}
export type LibraryStackNavigation = NavigationProp<LibraryStackParamList>

export default function LibraryStackNavigator() {
	return (
		<Stack.Navigator>
			<Stack.Screen name="Libraries" component={LibrariesList} options={{ headerShown: false }} />
			<Stack.Screen
				name="LibrarySeries"
				component={LibrarySeriesList}
				options={{ headerShown: false }}
			/>
			<Stack.Screen
				name="SeriesBooks"
				component={LibrarySeriesBookList}
				options={{ headerShown: false }}
			/>
		</Stack.Navigator>
	)
}
