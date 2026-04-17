import { Stack, useNavigation } from 'expo-router'
import { useLayoutEffect } from 'react'
import { Platform } from 'react-native'

export function useSeriesFilterMenu() {
	const navigation = useNavigation()
	useLayoutEffect(() => {
		if (Platform.OS === 'android') {
			// navigation.setOptions({
			// 	// headerLeft: () => <SeriesSortAndDisplayMenu />,
			// })
		}
	}, [navigation])

	// todo: make functional, requires core changes to filtering etc
	if (Platform.OS === 'ios') {
		return (
			<Stack.Toolbar.Menu icon="line.3.horizontal.decrease">
				<Stack.Toolbar.MenuAction icon="eyeglasses" disabled>
					Currently Reading
				</Stack.Toolbar.MenuAction>
				<Stack.Toolbar.MenuAction icon="clock.badge" disabled>
					Not Started
				</Stack.Toolbar.MenuAction>
				<Stack.Toolbar.MenuAction icon="checkmark.circle" disabled>
					Finished
				</Stack.Toolbar.MenuAction>

				{/*this is a mock based on reference*/}
				<Stack.Toolbar.Menu inline title="Content">
					<Stack.Toolbar.MenuAction icon="book" disabled>
						Books
					</Stack.Toolbar.MenuAction>
					<Stack.Toolbar.MenuAction icon="bubble" disabled>
						Comics
					</Stack.Toolbar.MenuAction>
					{/*what icon to use...*/}
					<Stack.Toolbar.MenuAction icon="wand.and.stars" disabled>
						Manga
					</Stack.Toolbar.MenuAction>
				</Stack.Toolbar.Menu>
			</Stack.Toolbar.Menu>
		)
	}

	return null
}

function AndroidMenu() {}
