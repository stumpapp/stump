import { createNativeStackNavigator } from '@react-navigation/native-stack'

import LibrariesList from './LibrariesList'
import LibrarySeriesBookList from './LibrarySeriesBooks'
import LibrarySeriesList from './LibrarySeriesList'

const Stack = createNativeStackNavigator()

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
