import { createNativeStackNavigator } from '@react-navigation/native-stack'
import React from 'react'

import { BookStackNavigator } from './book'
import MainTabNavigator from './MainTabNavigator'

const Stack = createNativeStackNavigator()

/*
----- STACK
------ Statck item 1:
----- TABS
------- 1. Home
------- 2. Libraries (STACK)
----------- List of libraries (screen doesn't need initial state)
----------- List of series in a selected library (screen requires library ID here)
----------- list of books in a selected series (screen requires series ID here)
----------- An overview of a selected book (screen requires book ID here) <-- OUTSIDE THE CURRENT STACK INDEX
----------- Book reader (screen requires book ID here) <-- OUTSIDE THE CURRENT STACK INDEX
-------- 3. Explore (don't impl yet)
-------- 4. Settings (STACK) (root screen, probably just a list like Discord)
------------ List of all groups (e.g. account, preferences, server settings, logs, etc.)
------------ Screen in the stack for each group above ^
-------- Stack item 2:
---------- STACK
------------- Book overview
------------- Book reader

*/

// Tenative tabs:
// 1. Home / Landing (shows in progress books and shit) (prolly no stack)
// 2. Libraries (stack navigator, renders a flat list of series, stack for series' books, etc)
// 3. Explore / Search tab (search for book) --> skip for now
// 4. Settings (def stack navigator for different settings pages)

export default function AuthenticatedNavigator() {
	return (
		<Stack.Navigator>
			<Stack.Screen name="MainTabs" component={MainTabNavigator} options={{ headerShown: false }} />
			<Stack.Screen
				name="BookStack"
				component={BookStackNavigator}
				options={{ headerShown: false }}
			/>
		</Stack.Navigator>
	)
}
