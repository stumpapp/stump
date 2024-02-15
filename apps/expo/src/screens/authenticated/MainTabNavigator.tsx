import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { FolderSearch, Library, Settings2, TreeDeciduous } from 'lucide-react-native'

import Explore from './explore/Explore'
import Home from './Home'
import { LibraryStackNavigator } from './libraries'
import Settings from './settings/Settings'

const Tab = createBottomTabNavigator()

export default function MainTabNavigator() {
	return (
		<Tab.Navigator
			screenOptions={({ route }) => ({
				tabBarActiveTintColor: 'black',
				tabBarIcon: ({ color, size }) => {
					let Icon = Settings2

					if (route.name == 'Home') {
						Icon = TreeDeciduous
					} else if (route.name == 'Explore') {
						Icon = FolderSearch
					} else if (route.name == 'LibraryStackNavigator') {
						Icon = Library
					}

					return <Icon color={color} size={size} />
				},
				tabBarInactiveTintColor: 'gray',
			})}
		>
			<Tab.Screen name="Home" component={Home} options={{ headerShown: false }} />
			<Tab.Screen
				name="LibraryStackNavigator"
				component={LibraryStackNavigator}
				options={{ headerShown: false, title: 'Libraries' }}
			/>
			<Tab.Screen name="Explore" component={Explore} options={{ headerShown: false }} />
			<Tab.Screen name="Settings" component={Settings} options={{ headerShown: false }} />
		</Tab.Navigator>
	)
}
