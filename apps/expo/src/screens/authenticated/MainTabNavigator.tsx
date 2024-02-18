import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Home as HomeIcon, Library, Search, Settings as SettingsIcon } from 'lucide-react-native'
import { useColorScheme } from 'nativewind'

import { gray } from '@/constants/colors'

import Explore from './explore/Explore'
import Home from './Home'
import { LibraryStackNavigator } from './libraries'
import Settings from './settings/Settings'

const Tab = createBottomTabNavigator()

export default function MainTabNavigator() {
	const { colorScheme } = useColorScheme()

	return (
		<Tab.Navigator
			screenOptions={({ route }) => ({
				tabBarActiveTintColor: colorScheme === 'dark' ? gray[100] : gray[900],
				tabBarIcon: ({ color, size }) => {
					let Icon = SettingsIcon

					if (route.name == 'Home') {
						Icon = HomeIcon
					} else if (route.name == 'Explore') {
						Icon = Search
					} else if (route.name == 'LibraryStackNavigator') {
						Icon = Library
					}

					return <Icon color={color} size={size} />
				},
				tabBarInactiveTintColor: colorScheme === 'dark' ? gray[400] : gray[600],
				tabBarStyle: {
					backgroundColor: colorScheme === 'dark' ? gray[950] : 'white',
					borderTopColor: colorScheme === 'dark' ? gray[800] : gray[50],
				},
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
