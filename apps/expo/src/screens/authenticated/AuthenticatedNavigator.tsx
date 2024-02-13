import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { FolderSearch, Library, Settings2, TreeDeciduous } from 'lucide-react-native'
import React from 'react'

import Explore from './explore/Explore'
import Home from './Home'
import Libraries from './libraries/Libraries'
import Settings from './settings/Settings'

// TODO: make a tab navigator, not stack
const Tab = createBottomTabNavigator()

// TODO: This will be the root navigator component for all of the authenticated screens
// it should have a tab navigator, with stack navigators as needed (e.g. probably settings has nested stacks?)

// TODO: install this -> https://lucide.dev/guide/packages/lucide-react-native -> for icons

/*
----- TABS
------- 1. Home
------- 2. Libraries (STACK)
----------- List of libraries (screen doesn't need initial state)
----------- List of series in a selected library (screen requires library ID here)
----------- list of books in a selected series (screen requires series ID here)
----------- An overview of a selected book (screen requires book ID here)
----------- Book reader (screen requires book ID here)
-------- 3. Explore (don't impl yet)
-------- 4. Settings (STACK) (root screen, probably just a list like Discord)
------------ List of all groups (e.g. account, preferences, server settings, logs, etc.)
------------ Screen in the stack for each group above ^

*/

// Tenative tabs:
// 1. Home / Landing (shows in progress books and shit) (prolly no stack)
// 2. Libraries (stack navigator, renders a flat list of series, stack for series' books, etc)
// 3. Explore / Search tab (search for book) --> skip for now
// 4. Settings (def stack navigator for different settings pages)

export default function AuthenticatedNavigator() {
	return (
		<Tab.Navigator
			screenOptions={({ route }) => ({
				tabBarActiveTintColor: 'black',
				tabBarIcon: ({ focused, color, size }) => {
					let icon

					if (route.name == 'Home') {
						icon = (
							<TreeDeciduous fill={focused ? 'black' : 'transparent'} color={color} size={size} />
						)
					} else if (route.name == 'Settings') {
						icon = <Settings2 fill={focused ? 'black' : 'transparent'} color={color} size={size} />
					} else if (route.name == 'Explore') {
						icon = (
							<FolderSearch fill={focused ? 'black' : 'transparent'} color={color} size={size} />
						)
					} else if (route.name == 'Libraries') {
						icon = <Library fill={focused ? 'black' : 'transparent'} color={color} size={size} />
					}

					return icon
				},
				tabBarInactiveTintColor: 'gray',
			})}
		>
			<Tab.Screen name="Home" component={Home} options={{ headerShown: false }} />
			<Tab.Screen name="Libraries" component={Libraries} options={{ headerShown: false }} />
			<Tab.Screen name="Explore" component={Explore} options={{ headerShown: false }} />
			<Tab.Screen name="Settings" component={Settings} options={{ headerShown: false }} />
		</Tab.Navigator>
	)
}
