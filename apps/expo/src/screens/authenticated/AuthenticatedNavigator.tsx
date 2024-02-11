import { StatusBar } from 'expo-status-bar'
import React from 'react'
import { Text, View } from 'react-native'

// TODO: This will be the root navigator component for all of the authenticated screens
// it should have a tab navigator, with stack navigators as needed (e.g. probably settings has nested stacks?)

// Large grouping entities:
// 1. Library
// 2. Smart lists
// 3. Book clubs
// 4. Future will have reading lists (dont worry for now)
// 5. Future will have collections
// 5. Series

// Traverse library: series OR books (from all series), click series -> books in THAT series, click book -> book overview

// FIRST MOBILE RELEASE:
// Traverse a library for its series, click a series, traverse the series for books, click a book, read the book

// Afterwards, every other big grouping entity can be a feature added on. Otherwise, way too much scope

// Tenative tabs:
// 1. Home / Landing (shows in progress books and shit)
// 2. Libraries (stack navigator, renders a flat list of series, stack for series' books, etc)
// 3. Explore / Search tab (search for book)
// 4. Settings

export default function AuthenticatedNavigator() {
	return (
		<View className="flex-1 items-center justify-center">
			<Text>I am home</Text>
			<StatusBar style="auto" />
		</View>
	)
}
